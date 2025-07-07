# =============================================================================
# BACKEND DA APLICAÇÃO WEB - backend.py
# Este script usa Flask para criar uma API que processa as planilhas.
# Ele não tem interface gráfica. Ele apenas "ouve" a internet.
# =============================================================================

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import io

# --- Configuração da Aplicação Flask ---
app = Flask(__name__)
# Habilita o CORS para que o seu site no Vercel possa se comunicar com este backend
CORS(app) 

# --- A LÓGICA DE VALIDAÇÃO (adaptada da sua classe) ---
def validar_propostas(df_unificado, df_extrator):
    """
    Recebe dois DataFrames do pandas e executa a lógica de validação.
    Retorna o DataFrame unificado com a nova coluna 'Status_Conta'.
    """
    print("[BACKEND] Iniciando o processo de validação...")

    coluna_proposta = 'Proposta'
    coluna_contrato = 'Número de Contrato'

    # Validação de segurança: verifica se as colunas existem
    if coluna_proposta not in df_unificado.columns:
        raise ValueError(f"Coluna '{coluna_proposta}' não encontrada no arquivo Unificado.")
    if coluna_contrato not in df_extrator.columns:
        raise ValueError(f"Coluna '{coluna_contrato}' não encontrada no arquivo Extrator.")

    # Limpa e prepara a coluna do EXTRETOR para comparação
    coluna_contrato_processada = df_extrator[coluna_contrato].dropna().astype(str).str.strip()
    propostas_extrator_set = set(coluna_contrato_processada)
    print(f"[BACKEND] {len(propostas_extrator_set)} contratos únicos encontrados no Extrator.")

    # Limpa e prepara a coluna do UNIFICADO para comparação
    coluna_proposta_processada = df_unificado[coluna_proposta].astype(str).str.strip()

    # Aplica a validação (a regra de negócio principal)
    df_unificado['Status_Conta'] = coluna_proposta_processada.apply(
        lambda x: 'CONTA ABERTA' if x and x in propostas_extrator_set else 'PENDENTE'
    )
    
    contas_abertas = len(df_unificado[df_unificado['Status_Conta'] == 'CONTA ABERTA'])
    print(f"[BACKEND] Validação concluída. {contas_abertas} contas marcadas como ABERTAS.")

    return df_unificado

# --- O PONTO DE ENTRADA DA API ---
@app.route('/api/processar', methods=['POST'])
def processar_arquivos():
    """
    Esta função é chamada quando o Frontend envia os arquivos.
    """
    print("\n[BACKEND] Requisição recebida na URL /api/processar.")
    
    try:
        # 1. Verifica se os arquivos foram enviados na requisição
        if 'unificado' not in request.files or 'extrator' not in request.files:
            print("[BACKEND] ERRO: Arquivos não encontrados na requisição.")
            return jsonify({"error": "Arquivos 'unificado' e 'extrator' são obrigatórios."}), 400

        arquivo_unificado = request.files['unificado']
        arquivo_extrator = request.files['extrator']
        print(f"[BACKEND] Arquivos recebidos: {arquivo_unificado.filename}, {arquivo_extrator.filename}")

        # 2. Lê os arquivos em memória usando pandas
        df_unificado = pd.read_excel(arquivo_unificado)
        df_extrator = pd.read_excel(arquivo_extrator)
        print("[BACKEND] Arquivos lidos com sucesso para DataFrames pandas.")

        # 3. Chama a função de validação
        df_resultado = validar_propostas(df_unificado, df_extrator)

        # 4. Converte o DataFrame resultante para um formato que a web entende (JSON)
        # 'records' cria uma lista de dicionários, ideal para exibir em tabelas no frontend
        resultado_json = df_resultado.to_json(orient='records')
        
        print("[BACKEND] Processamento bem-sucedido. Enviando resultado de volta.")
        # 5. Devolve o resultado como uma resposta JSON bem-sucedida
        return resultado_json, 200

    except ValueError as ve:
        print(f"[BACKEND] ERRO DE VALIDAÇÃO: {ve}")
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print(f"[BACKEND] ERRO INESPERADO: {e}")
        return jsonify({"error": f"Ocorreu um erro inesperado no servidor: {e}"}), 500

# --- Inicia o servidor Flask quando o script é executado ---
if __name__ == '__main__':
    # app.run() vai iniciar um servidor local, geralmente na porta 5000.
    # debug=True faz com que o servidor reinicie automaticamente quando você salva o arquivo.
    print("--- SERVIDOR BACKEND INICIADO ---")
    print("Ouvindo em http://127.0.0.1:5000")
    print("Aguardando requisições do Frontend...")
    app.run(debug=True, port=5000)
