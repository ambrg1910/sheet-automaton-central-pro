// =============================================================================
// SCRIPT DO FRONTEND - script.js
// Este código é executado no navegador do usuário.
// Ele envia os arquivos para o Backend e exibe o resultado.
// =============================================================================

// --- Seleciona os elementos do HTML ---
const btnProcessar = document.getElementById('btnProcessar');
const inputUnificado = document.getElementById('arquivoUnificado');
const inputExtrator = document.getElementById('arquivoExtrator');
const statusDiv = document.getElementById('status');
const resultadoDiv = document.getElementById('resultado');
const tabelaResultado = document.getElementById('tabelaResultado');

// --- URL do nosso Backend ---
// Quando rodando localmente, é este o endereço do servidor Flask.
const backendUrl = 'http://127.0.0.1:5000/api/processar';

// --- Adiciona um "ouvinte" ao botão de processar ---
btnProcessar.addEventListener('click', async () => {
    // 1. Pega os arquivos selecionados pelo usuário
    const arquivoUnificado = inputUnificado.files[0];
    const arquivoExtrator = inputExtrator.files[0];

    // 2. Validação: verifica se ambos os arquivos foram selecionados
    if (!arquivoUnificado || !arquivoExtrator) {
        statusDiv.textContent = 'ERRO: Por favor, selecione ambos os arquivos.';
        statusDiv.style.color = '#cf6679'; // Cor de erro
        return;
    }

    // 3. Prepara os dados para envio
    const formData = new FormData();
    formData.append('unificado', arquivoUnificado);
    formData.append('extrator', arquivoExtrator);

    // 4. Desabilita o botão e mostra status de "processando"
    btnProcessar.disabled = true;
    statusDiv.textContent = 'Processando... Isso pode levar alguns segundos.';
    statusDiv.style.color = '#03dac6'; // Cor de sucesso/info
    resultadoDiv.style.display = 'none'; // Esconde resultados antigos

    try {
        // 5. Envia os arquivos para o Backend usando fetch
        const response = await fetch(backendUrl, {
            method: 'POST',
            body: formData, // Não precisa de 'headers', o FormData cuida disso
        });

        // 6. Converte a resposta do backend para JSON
        const data = await response.json();

        // 7. Verifica se o backend retornou um erro
        if (!response.ok) {
            throw new Error(data.error || 'Ocorreu um erro desconhecido.');
        }

        // 8. Se tudo deu certo, exibe os resultados
        statusDiv.textContent = 'Processamento concluído com sucesso!';
        exibirResultadoEmTabela(data);

    } catch (error) {
        // 9. Se algo deu errado na comunicação ou no backend
        console.error('Erro no processamento:', error);
        statusDiv.textContent = `ERRO: ${error.message}`;
        statusDiv.style.color = '#cf6679';
    } finally {
        // 10. Reabilita o botão, não importa se deu certo ou errado
        btnProcessar.disabled = false;
    }
});

function exibirResultadoEmTabela(dados) {
    // Limpa a tabela antiga
    tabelaResultado.innerHTML = '';

    if (!dados || dados.length === 0) {
        return;
    }

    // Cria o cabeçalho da tabela
    const cabecalho = document.createElement('thead');
    const cabecalhoRow = document.createElement('tr');
    const colunas = Object.keys(dados[0]);
    colunas.forEach(coluna => {
        const th = document.createElement('th');
        th.textContent = coluna;
        cabecalhoRow.appendChild(th);
    });
    cabecalho.appendChild(cabecalhoRow);
    tabelaResultado.appendChild(cabecalho);

    // Cria o corpo da tabela
    const corpo = document.createElement('tbody');
    dados.forEach(item => {
        const tr = document.createElement('tr');
        colunas.forEach(coluna => {
            const td = document.createElement('td');
            td.textContent = item[coluna];
            // Destaque para a coluna de status
            if (coluna === 'Status_Conta' && item[coluna] === 'CONTA ABERTA') {
                td.style.color = '#03dac6';
                td.style.fontWeight = 'bold';
            }
            tr.appendChild(td);
        });
        corpo.appendChild(tr);
    });
    tabelaResultado.appendChild(corpo);

    // Mostra a div de resultados
    resultadoDiv.style.display = 'block';
}
