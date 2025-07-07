# =============================================================================
# CENTRAL DE AUTOMAÇÃO DE PLANILHAS v16.0 (VALIDADOR DE PROPOSTAS)
# CORREÇÃO E DEBUGGING: Lógica de unificação e validação revisada.
# =============================================================================

import customtkinter as ctk
import pandas as pd
import openpyxl
import plotly.express as px
import os
import json
import logging
import threading
import time
import sys
import re
import traceback
from tkinter import filedialog, messagebox
from tkinter import ttk

# --- CONFIGURAÇÃO DO LOGGING ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[logging.FileHandler("historico_automacao.log", mode='a', encoding='utf-8')])

# --- FUNÇÕES DE APOIO E VALIDAÇÃO ---
def clean_name(name):
    if not isinstance(name, str): return str(name)
    new_col = name.lower().strip()
    new_col = re.sub(r'[\s\.]+', '_', new_col)
    new_col = re.sub(r'[^a-z0-9_]+', '', new_col)
    new_col = re.sub(r'__+', '_', new_col)
    return new_col.strip('_')

def ler_arquivo(path, regras):
    try:
        tipo_arquivo = regras.get('tipo_arquivo', 'excel')
        header_row = regras.get('linha_do_cabecalho', 1) - 1
        if tipo_arquivo == 'excel':
            df = pd.read_excel(path, sheet_name=regras.get('nome_da_aba', 0), header=header_row)
        elif tipo_arquivo == 'csv':
            df = pd.read_csv(path, sep=regras.get('delimitador', ','), header=header_row, engine='python', on_bad_lines='warn')
        df.columns = [clean_name(col) for col in df.columns]
        return df
    except Exception as e:
        raise RuntimeError(f"Falha na leitura: {e}")

def ler_arquivo_simples(path):
    """Função para ler arquivos simples sem regras específicas"""
    try:
        if path.lower().endswith(('.xlsx', '.xls', '.xlsm')):
            df = pd.read_excel(path)
        elif path.lower().endswith(('.csv', '.txt')):
            df = pd.read_csv(path, sep=None, engine='python')
        else:
            raise ValueError("Formato de arquivo não suportado")
        return df
    except Exception as e:
        raise RuntimeError(f"Falha na leitura do arquivo: {e}")

def auto_adjust_excel_columns(excel_path):
    try:
        workbook = openpyxl.load_workbook(excel_path)
        for sheet_name in workbook.sheetnames:
            worksheet = workbook[sheet_name]
            for col in worksheet.columns:
                max_length = 0
                column_letter = col[0].column_letter
                for cell in col:
                    try:
                        if len(str(cell.value)) > max_length: max_length = len(str(cell.value))
                    except: pass
                adjusted_width = min((max_length + 2), 60)
                worksheet.column_dimensions[column_letter].width = adjusted_width
        workbook.save(excel_path)
    except Exception as e:
        logging.warning(f"Não foi possível auto-ajustar as colunas: {e}")

# --- JANELAS AUXILIARES ---
class PreviewWindow(ctk.CTkToplevel):
    def __init__(self, parent, file_path, regras):
        super().__init__(parent)
        self.title(f"Pré-visualização: {os.path.basename(file_path)}")
        self.geometry("1200x600")
        try:
            df_preview = ler_arquivo(file_path, regras).head(100)
            if df_preview.empty:
                ctk.CTkLabel(self, text="O arquivo de exemplo está vazio ou não pôde ser lido.", font=("Arial", 16)).pack(pady=20, padx=20)
                return
            style = ttk.Style(self)
            theme = ctk.get_appearance_mode()
            if theme == "Dark":
                style.theme_use("default")
                style.configure("Treeview", background="#2b2b2b", foreground="white", fieldbackground="#2b2b2b", borderwidth=0)
                style.map('Treeview', background=[('selected', '#22559b')])
                style.configure("Treeview.Heading", background="#565b5e", foreground="white", relief="flat")
                style.map("Treeview.Heading", background=[('active', '#3484F0')])
            else: style.theme_use("clam")
            tree_frame = ctk.CTkFrame(self)
            tree_frame.pack(pady=10, padx=10, fill="both", expand=True)
            tree_scroll_y = ctk.CTkScrollbar(tree_frame, command=lambda *args: self.tree.yview(*args))
            tree_scroll_y.pack(side="right", fill="y")
            tree_scroll_x = ctk.CTkScrollbar(tree_frame, orientation="horizontal", command=lambda *args: self.tree.xview(*args))
            tree_scroll_x.pack(side="bottom", fill="x")
            self.tree = ttk.Treeview(tree_frame, yscrollcommand=tree_scroll_y.set, xscrollcommand=tree_scroll_x.set)
            self.tree.pack(fill="both", expand=True)
            self.tree["columns"] = list(df_preview.columns)
            self.tree["show"] = "headings"
            for col in self.tree["columns"]:
                self.tree.heading(col, text=col)
                self.tree.column(col, width=150, anchor='w')
            for _, row in df_preview.iterrows():
                self.tree.insert("", "end", values=list(row.fillna('')))
        except Exception as e:
            error_frame = ctk.CTkFrame(self, fg_color="#8B0000")
            error_frame.pack(pady=20, padx=20, fill="both", expand=True)
            ctk.CTkLabel(error_frame, text="ERRO AO PRÉ-VISUALIZAR!", font=("Arial", 18, "bold")).pack(pady=10)
            ctk.CTkLabel(error_frame, text="MOTIVO: As regras no config.json não correspondem ao formato do arquivo.", wraplength=1000).pack(pady=5)
            ctk.CTkLabel(error_frame, text=f"DETALHES: {e}", wraplength=1000, font=("Courier New", 10)).pack(pady=10)

class SummaryWindow(ctk.CTkToplevel):
    def __init__(self, parent, stats):
        super().__init__(parent)
        self.title("Sumário do Processamento")
        self.geometry("600x420")
        ctk.CTkLabel(self, text="Processo Concluído!", font=("Arial", 20, "bold"), text_color="#33FF33").pack(pady=15)
        for text in [f"Arquivos Encontrados: {stats['total']}", f"Processados com Sucesso: {stats['success']}", f"Ignorados / Com Erro: {stats['errors']}", f"Total de Linhas Unificadas: {stats['rows']:,}".replace(",", "."), f"Tempo de Execução: {stats['time']:.2f} segundos"]:
            ctk.CTkLabel(self, text=text, font=("Arial", 14)).pack(anchor="w", padx=30, pady=2)
        
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=25, fill="x", padx=30)
        
        ctk.CTkButton(btn_frame, text="Abrir Arquivo de Saída", command=lambda: os.startfile(stats['output_path'])).pack(side="left", expand=True, padx=5, ipady=8)
        
        if stats.get('dashboard_path'):
            ctk.CTkButton(btn_frame, text="Abrir Dashboard", command=lambda: os.startfile(stats['dashboard_path']), fg_color="#FF9900", hover_color="#CC7A00").pack(side="left", expand=True, padx=5, ipady=8)

        ctk.CTkButton(btn_frame, text="Abrir Pasta de Destino", command=lambda: os.startfile(os.path.dirname(stats['output_path']))).pack(side="right", expand=True, padx=5, ipady=8)

class ValidationSummaryWindow(ctk.CTkToplevel):
    def __init__(self, parent, stats):
        super().__init__(parent)
        self.title("Relatório de Validação")
        self.geometry("650x450")
        
        ctk.CTkLabel(self, text="Validação de Propostas Concluída!", font=("Arial", 20, "bold"), text_color="#33FF33").pack(pady=15)
        stats_frame = ctk.CTkFrame(self)
        stats_frame.pack(pady=20, padx=30, fill="x")
        ctk.CTkLabel(stats_frame, text="RESUMO EXECUTIVO", font=("Arial", 16, "bold")).pack(pady=10)
        
        for text in [f"Total de Propostas Analisadas: {stats['total_propostas']:,}".replace(",", "."), f"Contas Abertas (Encontradas): {stats['contas_abertas']:,}".replace(",", "."), f"Contas Pendentes (Não Encontradas): {stats['contas_pendentes']:,}".replace(",", "."), f"Taxa de Sucesso: {stats['taxa_sucesso']:.1f}%", f"Tempo de Execução: {stats['tempo']:.2f} segundos"]:
            ctk.CTkLabel(stats_frame, text=text, font=("Arial", 14)).pack(anchor="w", padx=20, pady=2)
        
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=25, fill="x", padx=30)
        ctk.CTkButton(btn_frame, text="Abrir Relatório de Validação", command=lambda: os.startfile(stats['output_path']), fg_color="#1E90FF", hover_color="#0066CC").pack(side="left", expand=True, padx=5, ipady=8)
        ctk.CTkButton(btn_frame, text="Abrir Pasta de Destino", command=lambda: os.startfile(os.path.dirname(stats['output_path']))).pack(side="right", expand=True, padx=5, ipady=8)

# --- CLASSE DE PROCESSAMENTO (PASSO 1) ---
class Processor:
    def __init__(self, app_instance):
        self.app = app_instance
        self.configs = app_instance.configuracoes

    def _unificar_e_tratar_dados(self, dados_validos, regras):
        self.app.log("--- Unificando e tratando os dados ---", "INFO")
        
        planilha_final = pd.concat(dados_validos, ignore_index=True)
        self.app.log(f"[DEBUG] Colunas unificadas (antes do tratamento): {list(planilha_final.columns)}", "WARNING")
        
        regras_colunas_orig = regras.get("colunas_padrao", {})
        if not regras_colunas_orig:
            self.app.log("ALERTA: Seção 'colunas_padrao' está vazia no config.json!", "ERROR")
            return planilha_final # Retorna sem tratar se não houver regras

        map_clean_to_orig = {clean_name(k): k for k in regras_colunas_orig.keys()}
        self.app.log(f"[DEBUG] Mapa de renomeação (limpo -> original): {list(map_clean_to_orig.items())[:5]}...", "WARNING")
        
        colunas_limpas_no_df = planilha_final.columns
        colunas_a_manter = [col for col in colunas_limpas_no_df if col in map_clean_to_orig]
        
        if 'arquivo_origem' in colunas_limpas_no_df:
            colunas_a_manter.append('arquivo_origem')
        
        colunas_a_manter = sorted(list(set(colunas_a_manter))) 

        self.app.log(f"[DEBUG] Colunas que serão mantidas no DF final: {colunas_a_manter}", "WARNING")
        df_filtrado = planilha_final[colunas_a_manter]

        df_renomeado = df_filtrado.rename(columns=map_clean_to_orig)
        self.app.log(f"[DEBUG] Colunas FINAIS (após renomear): {list(df_renomeado.columns)}", "WARNING")
        
        colunas_originais_para_dropna = [c for c in regras_colunas_orig.keys() if c in df_renomeado.columns]
        if colunas_originais_para_dropna:
            df_renomeado.dropna(how='all', subset=colunas_originais_para_dropna, inplace=True)
        
        return df_renomeado

    def run(self, processo_nome, pasta_in, pasta_out, silent=False):
        start_time = time.time()
        self.app.log(f"--- Iniciando processo: {processo_nome} ---", "INFO")
        
        regras = self.configs.get(processo_nome)
        if not self._validar_regras_config(regras):
            if not silent: self.app.after(100, lambda: self.app.btn_iniciar.configure(state="normal", text="INICIAR PROCESSAMENTO"))
            return

        arquivos = self._descobrir_arquivos(pasta_in, regras)
        if not arquivos: return

        dados_validos, erros = self._processar_arquivos_em_lote(arquivos, regras, silent)
        if not dados_validos: 
            self._gerar_relatorio_erros(erros, processo_nome)
            if not silent: self.app.after(100, lambda: self.app.btn_iniciar.configure(state="normal", text="INICIAR PROCESSAMENTO"))
            return

        planilha_final_renamed = self._unificar_e_tratar_dados(dados_validos, regras)
        
        try:
            self._gerar_relatorio_excel(planilha_final_renamed, pasta_out, regras)
        except Exception as e:
            self.app.log(f"Erro CRÍTICO ao salvar o arquivo Excel de saída: {e}", "ERROR")
            if not silent: self.app.after(100, lambda: self.app.btn_iniciar.configure(state="normal", text="INICIAR PROCESSAMENTO"))
            return
        
        dashboard_path = self._gerar_dashboard_html(planilha_final_renamed, pasta_out, regras)
            
        stats = {"total": len(arquivos), "success": len(dados_validos), "errors": len(erros), 
                 "rows": len(planilha_final_renamed), "time": time.time() - start_time, 
                 "output_path": pasta_out, "dashboard_path": dashboard_path}
        
        self._finalizar_execucao(stats, erros, processo_nome, silent)

    def _validar_regras_config(self, regras):
        self.app.log("Validando regras do processo...", "INFO")
        if not regras:
             self.app.log("Configurações do processo não encontradas.", "ERROR")
             messagebox.showerror("Erro de Configuração", "O processo selecionado não foi encontrado no config.json")
             return False
        return True

    def _descobrir_arquivos(self, pasta_in, regras):
        tipo_arquivo = regras.get('tipo_arquivo', 'excel')
        extensoes = ('.xlsx', '.xls', '.xlsm') if tipo_arquivo == 'excel' else ('.csv', '.txt')
        arquivos = [os.path.join(r, f) for r, _, files in os.walk(pasta_in) for f in files if f.lower().endswith(extensoes) and not f.startswith('~')]
        if not arquivos: self.app.log("Nenhum arquivo compatível encontrado.", "WARNING"); return []
        return arquivos

    def _processar_arquivos_em_lote(self, arquivos, regras, silent):
        dados_validos, erros, total = [], [], len(arquivos)
        regras_essenciais_clean = [clean_name(c) for c in regras.get("colunas_essenciais", [])]
        for i, path in enumerate(arquivos):
            nome_arquivo = os.path.basename(path)
            self.app.log(f"Processando {i+1}/{total}: {nome_arquivo}", "INFO")
            if not silent: self.app.progressbar.set((i+1) / total)
            try:
                df = ler_arquivo(path, regras)
                if df.empty: 
                    erros.append(f"{nome_arquivo}: Ignorado - Vazio.")
                    continue
                if regras_essenciais_clean and not all(col in df.columns for col in regras_essenciais_clean):
                    colunas_faltantes = [c for c in regras_essenciais_clean if c not in df.columns]
                    erros.append(f"{nome_arquivo}: Ignorado - Colunas essenciais ausentes: {colunas_faltantes}")
                    continue
                df['arquivo_origem'] = nome_arquivo
                dados_validos.append(df)
            except Exception as e:
                erros.append(f"{nome_arquivo}: Erro - {e}")
        return dados_validos, erros
    
    def _gerar_relatorio_excel(self, df, pasta_out, regras):
        with pd.ExcelWriter(pasta_out, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Dados Unificados', index=False)
            # Código da Tabela Dinâmica omitido por simplicidade, pode ser adicionado de volta se necessário
        self.app.log(f"Relatório salvo em: {pasta_out}", "SUCCESS")
        self.app.log("Ajustando colunas no Excel...", "INFO")
        auto_adjust_excel_columns(pasta_out)

    def _gerar_dashboard_html(self, df, pasta_out, regras):
        # Desabilitado para simplificar e focar no problema principal
        return None

    def _gerar_relatorio_erros(self, erros, processo_nome):
        if erros:
            with open('Relatorio_de_Erros.txt', 'w', encoding='utf-8') as f:
                f.write(f"RELATÓRIO DE ERROS: {processo_nome}\n" + "="*50 + "\n\n- " + "\n- ".join(erros))
            self.app.log(f"Problemas encontrados. Consulte 'Relatorio_de_Erros.txt'", "WARNING")

    def _finalizar_execucao(self, stats, erros, processo_nome, silent):
        self.app.log(f"SUCESSO! Processo concluído.", "SUCCESS")
        if erros: self._gerar_relatorio_erros(erros, processo_nome)
        if not silent: self.app.after(100, lambda: SummaryWindow(self.app, stats))

# --- CLASSE DE VALIDAÇÃO (PASSO 2) ---
class ValidadorPropostas:
    def __init__(self, app_instance):
        self.app = app_instance

    def run_validation_process(self, arquivo_unificado, arquivo_extrator, arquivo_saida):
        start_time = time.time()
        self.app.log("=== INICIANDO VALIDAÇÃO DE PROPOSTAS ===", "INFO")
        
        try:
            self.app.log("Carregando arquivo unificado...", "INFO")
            df_unificado = ler_arquivo_simples(arquivo_unificado)
            self.app.log(f"[DEBUG] Colunas do Unificado: {list(df_unificado.columns)}", "WARNING")
            
            self.app.log("Carregando arquivo extrator...", "INFO")
            df_extrator = ler_arquivo_simples(arquivo_extrator)
            self.app.log(f"[DEBUG] Colunas do Extrator: {list(df_extrator.columns)}", "WARNING")
            
            coluna_proposta = 'Proposta'
            coluna_contrato = 'Número de Contrato'
            
            if coluna_proposta not in df_unificado.columns:
                raise ValueError(f"ERRO FATAL: Coluna '{coluna_proposta}' não encontrada no arquivo Unificado. Verifique o resultado do Passo 1.")
            if coluna_contrato not in df_extrator.columns:
                raise ValueError(f"ERRO FATAL: Coluna '{coluna_contrato}' não encontrada no arquivo Extrator.")
            
            self.app.log("Executando validação de propostas...", "INFO")
            
            # Limpa e prepara o extrator
            df_extrator[coluna_contrato] = df_extrator[coluna_contrato].dropna().astype(str).str.strip()
            propostas_extrator = set(df_extrator[coluna_contrato])
            self.app.log(f"[DEBUG] Total de contratos únicos e limpos no extrator: {len(propostas_extrator)}", "WARNING")
            if propostas_extrator: self.app.log(f"[DEBUG] Amostra de contratos do Extrator: {list(propostas_extrator)[:5]}", "WARNING")

            # Limpa e prepara o arquivo unificado
            df_unificado[coluna_proposta] = df_unificado[coluna_proposta].astype(str).str.strip()
            self.app.log(f"[DEBUG] Amostra de propostas do Unificado: {list(df_unificado[coluna_proposta].head())}", "WARNING")
            
            # Aplica a validação
            df_unificado['Status_Conta'] = df_unificado[coluna_proposta].apply(
                lambda x: 'CONTA ABERTA' if x and x in propostas_extrator else 'PENDENTE'
            )
            
            contas_abertas = len(df_unificado[df_unificado['Status_Conta'] == 'CONTA ABERTA'])
            self.app.log(f"[DEBUG] Total de 'CONTA ABERTA' encontradas: {contas_abertas}", "WARNING")

            total_propostas = len(df_unificado)
            contas_pendentes = total_propostas - contas_abertas
            taxa_sucesso = (contas_abertas / total_propostas * 100) if total_propostas > 0 else 0
            
            self.app.log("Salvando relatório de validação...", "INFO")
            df_unificado.to_excel(arquivo_saida, index=False, engine='openpyxl')
            auto_adjust_excel_columns(arquivo_saida)
            
            tempo_execucao = time.time() - start_time
            stats = {
                'total_propostas': total_propostas, 'contas_abertas': contas_abertas,
                'contas_pendentes': contas_pendentes, 'taxa_sucesso': taxa_sucesso,
                'tempo': tempo_execucao, 'output_path': arquivo_saida
            }
            
            self.app.log(f"VALIDAÇÃO CONCLUÍDA!", "SUCCESS")
            self.app.log(f"Total: {total_propostas} | Abertas: {contas_abertas} | Pendentes: {contas_pendentes}", "SUCCESS")
            self.app.after(100, lambda: ValidationSummaryWindow(self.app, stats))
            
        except Exception as e:
            error_details = traceback.format_exc()
            self.app.log(f"ERRO CRÍTICO NA VALIDAÇÃO: {e}\n{error_details}", "ERROR")
            messagebox.showerror("Erro de Validação", f"Falha catastrófica na validação:\n\n{str(e)}")


# --- INTERFACE PRINCIPAL COM ABAS ---
class App(ctk.CTk):
    def __init__(self, configs):
        super().__init__()
        self.title("Central de Automação de Planilhas v16.0 - Corrigido")
        self.geometry("900x750")
        ctk.set_appearance_mode("Dark")
        ctk.set_default_color_theme("blue")
        self.configuracoes = configs
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        self.tabview = ctk.CTkTabview(self, anchor="nw")
        self.tabview.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        
        self.tab_unificar = self.tabview.add("1. Unificar Relatórios")
        self.tab_validar = self.tabview.add("2. Validar Contas Abertas")
        
        self.setup_unification_tab()
        self.setup_validation_tab()
        self.setup_log_tags()

    def setup_unification_tab(self):
        tab = self.tab_unificar
        tab.grid_columnconfigure(0, weight=1)
        tab.grid_rowconfigure(4, weight=1)
        processos = list(self.configuracoes.keys()) if self.configuracoes else ["Erro: config.json inválido"]
        
        process_frame = ctk.CTkFrame(tab)
        process_frame.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        process_frame.grid_columnconfigure(1, weight=1)
        ctk.CTkLabel(process_frame, text="1. Processo:", font=("Arial", 14, "bold")).grid(row=0, column=0, padx=10, pady=10)
        self.combo_processo = ctk.CTkComboBox(process_frame, values=processos)
        self.combo_processo.grid(row=0, column=1, padx=10, pady=10, sticky="ew")
        
        input_frame = ctk.CTkFrame(tab)
        input_frame.grid(row=1, column=0, padx=10, pady=5, sticky="ew")
        input_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(input_frame, text="2. Pasta de Entrada:", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky="w", columnspan=3, padx=10)
        self.entry_pasta = ctk.CTkEntry(input_frame)
        self.entry_pasta.grid(row=1, column=0, padx=(10,5), pady=5, sticky="ew")
        ctk.CTkButton(input_frame, text="📂", width=30, command=lambda: os.startfile(self.entry_pasta.get()) if self.entry_pasta.get() and os.path.isdir(self.entry_pasta.get()) else None).grid(row=1, column=1, pady=5)
        ctk.CTkButton(input_frame, text="Procurar...", command=self.selecionar_pasta).grid(row=1, column=2, padx=10, pady=5)
        
        output_frame = ctk.CTkFrame(tab)
        output_frame.grid(row=2, column=0, padx=10, pady=5, sticky="ew")
        output_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(output_frame, text="3. Arquivo de Saída:", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky="w", columnspan=3, padx=10)
        self.entry_saida = ctk.CTkEntry(output_frame)
        self.entry_saida.grid(row=1, column=0, padx=(10,5), pady=5, sticky="ew")
        ctk.CTkButton(output_frame, text="📂", width=30, command=lambda: os.startfile(os.path.dirname(self.entry_saida.get())) if self.entry_saida.get() and os.path.exists(os.path.dirname(self.entry_saida.get())) else None).grid(row=1, column=1, pady=5)
        ctk.CTkButton(output_frame, text="Salvar Como...", command=self.definir_arquivo_saida).grid(row=1, column=2, padx=10, pady=5)
        
        aux_action_frame = ctk.CTkFrame(tab, fg_color="transparent")
        aux_action_frame.grid(row=3, column=0, padx=10, pady=5, sticky="ew")
        aux_action_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkButton(aux_action_frame, text="Testar Regras (Pré-visualizar)", command=self.open_preview_window).grid(row=0, column=0, padx=5, sticky="ew")
        
        log_frame = ctk.CTkFrame(tab)
        log_frame.grid(row=4, column=0, padx=10, pady=10, sticky="nsew")
        log_frame.grid_rowconfigure(0, weight=1)
        log_frame.grid_columnconfigure(0, weight=1)
        self.textbox_log = ctk.CTkTextbox(log_frame, state="disabled")
        self.textbox_log.grid(row=0, column=0, sticky="nsew")
        self.progressbar = ctk.CTkProgressBar(log_frame, mode='determinate')
        self.progressbar.grid(row=1, column=0, pady=5, sticky="ew")
        self.progressbar.set(0)
        
        self.btn_iniciar = ctk.CTkButton(tab, text="INICIAR PROCESSAMENTO", command=self.iniciar_processamento_thread, font=("Arial", 18, "bold"), height=50, fg_color="green", hover_color="darkgreen")
        self.btn_iniciar.grid(row=5, column=0, padx=10, pady=10, sticky="ew")

    def setup_validation_tab(self):
        tab = self.tab_validar
        tab.grid_columnconfigure(0, weight=1)
        tab.grid_rowconfigure(4, weight=1)
        
        title_frame = ctk.CTkFrame(tab, fg_color="transparent")
        title_frame.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        ctk.CTkLabel(title_frame, text="VALIDADOR DE PROPOSTAS", font=("Arial", 18, "bold")).pack()
        ctk.CTkLabel(title_frame, text="Compare propostas unificadas com o extrator para determinar status das contas", font=("Arial", 12), text_color="gray").pack()
        
        unif_frame = ctk.CTkFrame(tab)
        unif_frame.grid(row=1, column=0, padx=10, pady=5, sticky="ew")
        unif_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(unif_frame, text="1. Selecione o Relatório Unificado (saída do passo 1):", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky="w", columnspan=3, padx=10, pady=(10,5))
        self.entry_unificado = ctk.CTkEntry(unif_frame, placeholder_text="Arquivo Excel unificado...")
        self.entry_unificado.grid(row=1, column=0, padx=(10,5), pady=(0,10), sticky="ew")
        ctk.CTkButton(unif_frame, text="Procurar...", command=self.selecionar_arquivo_unificado).grid(row=1, column=2, padx=10, pady=(0,10))
        
        ext_frame = ctk.CTkFrame(tab)
        ext_frame.grid(row=2, column=0, padx=10, pady=5, sticky="ew")
        ext_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(ext_frame, text="2. Selecione o Extrator (relatório mestre de contas abertas):", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky="w", columnspan=3, padx=10, pady=(10,5))
        self.entry_extrator = ctk.CTkEntry(ext_frame, placeholder_text="Arquivo Excel/CSV do extrator...")
        self.entry_extrator.grid(row=1, column=0, padx=(10,5), pady=(0,10), sticky="ew")
        ctk.CTkButton(ext_frame, text="Procurar...", command=self.selecionar_arquivo_extrator).grid(row=1, column=2, padx=10, pady=(0,10))
        
        output_val_frame = ctk.CTkFrame(tab)
        output_val_frame.grid(row=3, column=0, padx=10, pady=5, sticky="ew")
        output_val_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(output_val_frame, text="3. Salvar Relatório de Validação Como:", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky="w", columnspan=3, padx=10, pady=(10,5))
        self.entry_saida_validacao = ctk.CTkEntry(output_val_frame, placeholder_text="Relatório_Validacao.xlsx")
        self.entry_saida_validacao.grid(row=1, column=0, padx=(10,5), pady=(0,10), sticky="ew")
        ctk.CTkButton(output_val_frame, text="Salvar Como...", command=self.definir_arquivo_saida_validacao).grid(row=1, column=2, padx=10, pady=(0,10))
        
        log_val_frame = ctk.CTkFrame(tab)
        log_val_frame.grid(row=4, column=0, padx=10, pady=10, sticky="nsew")
        log_val_frame.grid_rowconfigure(0, weight=1)
        log_val_frame.grid_columnconfigure(0, weight=1)
        self.textbox_log_validacao = ctk.CTkTextbox(log_val_frame, state="disabled")
        self.textbox_log_validacao.grid(row=0, column=0, sticky="nsew")
        
        self.btn_validar = ctk.CTkButton(tab, text="INICIAR VALIDAÇÃO", command=self.iniciar_validacao_thread, font=("Arial", 18, "bold"), height=50, fg_color="#1E90FF", hover_color="#0066CC")
        self.btn_validar.grid(row=5, column=0, padx=10, pady=10, sticky="ew")

    def setup_log_tags(self):
        for textbox in [self.textbox_log, self.textbox_log_validacao]:
            textbox.tag_config("INFO", foreground="white")
            textbox.tag_config("SUCCESS", foreground="#33FF33")
            textbox.tag_config("WARNING", foreground="yellow")
            textbox.tag_config("ERROR", foreground="#FF4444")

    def log(self, message, level="INFO"):
        level = level.upper()
        numeric_level = getattr(logging, level, logging.INFO)
        logging.log(numeric_level, message)
        
        try:
            current_tab = self.tabview.get()
            if "Unificar" in current_tab: textbox = self.textbox_log
            else: textbox = self.textbox_log_validacao
        except:
            textbox = self.textbox_log # Default se a aba não for encontrada

        textbox.configure(state="normal")
        textbox.insert("end", f"[{level}] {message}\n", level)
        textbox.configure(state="disabled")
        textbox.see("end")
        self.update_idletasks()

    def selecionar_pasta(self):
        path = filedialog.askdirectory(title="Selecione a Pasta de Entrada")
        if path: 
            self.entry_pasta.delete(0, 'end')
            self.entry_pasta.insert(0, path)

    def definir_arquivo_saida(self):
        path = filedialog.asksaveasfilename(title="Salvar Relatório Como...", initialfile="Relatorio_Unificado.xlsx", defaultextension=".xlsx", filetypes=[("Planilhas Excel", "*.xlsx")])
        if path: 
            self.entry_saida.delete(0, 'end')
            self.entry_saida.insert(0, path)

    def open_preview_window(self):
        regras = self.configuracoes.get(self.combo_processo.get())
        if not regras: 
            return messagebox.showerror("Erro", "Selecione um processo.")
        path = filedialog.askopenfilename(title="Selecione um arquivo de exemplo")
        if path: 
            PreviewWindow(self, path, regras)

    def iniciar_processamento_thread(self):
        if not self.entry_pasta.get() or not self.entry_saida.get(): 
            return messagebox.showerror("Entrada Inválida", "Defina a pasta de entrada e o arquivo de saída.")
        
        self.btn_iniciar.configure(state="disabled", text="Processando...")
        self.progressbar.set(0)
        processor = Processor(self)
        thread = threading.Thread(target=processor.run, args=(self.combo_processo.get(), self.entry_pasta.get(), self.entry_saida.get()))
        thread.start()
        self.monitor_thread(thread, self.btn_iniciar, "INICIAR PROCESSAMENTO")

    def selecionar_arquivo_unificado(self):
        path = filedialog.askopenfilename(title="Selecione o Arquivo Unificado", filetypes=[("Arquivos Excel", "*.xlsx"), ("Todos os arquivos", "*.*")])
        if path:
            self.entry_unificado.delete(0, 'end')
            self.entry_unificado.insert(0, path)

    def selecionar_arquivo_extrator(self):
        path = filedialog.askopenfilename(title="Selecione o Arquivo Extrator", filetypes=[("Arquivos Excel", "*.xlsx"), ("Arquivos CSV", "*.csv"), ("Todos os arquivos", "*.*")])
        if path:
            self.entry_extrator.delete(0, 'end')
            self.entry_extrator.insert(0, path)

    def definir_arquivo_saida_validacao(self):
        path = filedialog.asksaveasfilename(title="Salvar Relatório de Validação Como...", initialfile="Relatorio_Validacao.xlsx", defaultextension=".xlsx", filetypes=[("Planilhas Excel", "*.xlsx")])
        if path:
            self.entry_saida_validacao.delete(0, 'end')
            self.entry_saida_validacao.insert(0, path)

    def iniciar_validacao_thread(self):
        if not all([self.entry_unificado.get(), self.entry_extrator.get(), self.entry_saida_validacao.get()]):
            return messagebox.showerror("Campos Obrigatórios", "Todos os três campos de arquivo devem ser preenchidos.")
        
        if not os.path.exists(self.entry_unificado.get()):
            return messagebox.showerror("Arquivo Não Encontrado", f"Arquivo unificado não encontrado em:\n{self.entry_unificado.get()}")
        if not os.path.exists(self.entry_extrator.get()):
            return messagebox.showerror("Arquivo Não Encontrado", f"Arquivo extrator não encontrado em:\n{self.entry_extrator.get()}")
        
        self.btn_validar.configure(state="disabled", text="Validando...")
        validador = ValidadorPropostas(self)
        thread = threading.Thread(target=validador.run_validation_process, args=(self.entry_unificado.get(), self.entry_extrator.get(), self.entry_saida_validacao.get()))
        thread.start()
        self.monitor_thread(thread, self.btn_validar, "INICIAR VALIDAÇÃO")

    def monitor_thread(self, thread, button, original_text):
        if thread.is_alive():
            self.after(100, lambda: self.monitor_thread(thread, button, original_text))
        else:
            button.configure(state="normal", text=original_text)

if __name__ == "__main__":
    configs = {}
    try:
        with open('config.json', 'r', encoding='utf-8') as f:
            configs = json.load(f).get("Processos", {})
    except (FileNotFoundError, json.JSONDecodeError) as e:
        messagebox.showerror("Erro Crítico", f"Arquivo 'config.json' não encontrado ou com erro.\nÉ necessário um arquivo 'config.json' na mesma pasta para o programa funcionar.\n\nDetalhes: {e}")
        configs = {"Erro": {"colunas_padrao": {}}}
    
    app = App(configs)
    app.mainloop()
