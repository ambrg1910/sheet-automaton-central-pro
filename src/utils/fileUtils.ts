import * as XLSX from 'xlsx';

export const normalizeColumnName = (name: string): string => {
  if (!name || typeof name !== 'string') return String(name || '');
  
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s\.]+/g, '_')
    .replace(/[^a-z0-9_]+/g, '')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '');
};

export const readFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Não foi possível ler o arquivo'));
          return;
        }

        let workbook: XLSX.WorkBook;
        
        if (file.name.toLowerCase().endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'binary' });
        } else {
          workbook = XLSX.read(data, { type: 'array' });
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Encontrar linha do cabeçalho (linha 10 por padrão para Conta Nova)
        let headerRowIndex = 9; // Linha 10 (índice 9)
        
        // Verificar se existe cabeçalho na linha 10
        if (jsonData.length > headerRowIndex) {
          const potentialHeader = jsonData[headerRowIndex] as any[];
          if (!potentialHeader || !potentialHeader.some(cell => 
            cell && typeof cell === 'string' && 
            (cell.toLowerCase().includes('cpf') || 
             cell.toLowerCase().includes('proposta'))
          )) {
            // Se não encontrar na linha 10, procurar nas primeiras 15 linhas
            for (let i = 0; i < Math.min(15, jsonData.length); i++) {
              const row = jsonData[i] as any[];
              if (row && row.some(cell => 
                cell && typeof cell === 'string' && 
                (cell.toLowerCase().includes('cpf') || 
                 cell.toLowerCase().includes('proposta'))
              )) {
                headerRowIndex = i;
                break;
              }
            }
          }
        }

        const headers = jsonData[headerRowIndex] as string[];
        const dataRows = jsonData.slice(headerRowIndex + 1);
        
        const result = dataRows
          .filter(row => row && (row as any[]).some(cell => cell !== null && cell !== undefined && cell !== ''))
          .map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              if (header) {
                const normalizedKey = normalizeColumnName(header);
                obj[normalizedKey] = (row as any[])[index] || '';
                // Manter também a chave original para compatibilidade
                obj[header] = (row as any[])[index] || '';
              }
            });
            return obj;
          });

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));

    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
};