
# =============================================================================
# CENTRAL DE AUTOMAÇÃO DE PLANILHAS v15.0 (VALIDADOR DE PROPOSTAS)
# Nova funcionalidade: Validação de Propostas contra Extrator
# Interface com abas: 1. Unificar Relatórios | 2. Validar Contas Abertas
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
        
        # Estatísticas
        stats_frame = ctk.CTkFrame(self)
        stats_frame.pack(pady=20, padx=30, fill="x")
        
        ctk.CTkLabel(stats_frame, text="RESUMO EXECUTIVO", font=("Arial", 16, "bold")).pack(pady=10)
        
        for text in [
            f"Total de Propostas Analisadas: {stats['total_propostas']:,}".replace(",", "."),
            f"Contas Abertas (Encontradas no Extrator): {stats['contas_abertas']:,}".replace(",", "."),
            f"Contas Pendentes (Não Encontradas): {stats['contas_pendentes']:,}".replace(",", "."),
            f"Taxa de Sucesso: {stats['taxa_sucesso']:.1f}%",
            f"Tempo de Execução: {stats['tempo']:.2f} segundos"
        ]:
            ctk.CTkLabel(stats_frame, text=text, font=("Arial", 14)).pack(anchor="w", padx=20, pady=2)
        
        # Botões
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=25, fill="x", padx=30)
        
        ctk.CTkButton(btn_frame, text="Abrir Relatório de Validação", 
                     command=lambda: os.startfile(stats['output_path']),
                     fg_color="#1E90FF", hover_color="#0066CC").pack(side="left", expand=True, padx=5, ipady=8)
        
        ctk.CTkButton(btn_frame, text="Abrir Pasta de Destino", 
                     command=lambda: os.startfile(os.path.dirname(stats['output_path']))).pack(side="right", expand=True, padx=5, ipady=8)

# --- CLASSE DE PROCESSAMENTO PRINCIPAL ---
class Processor:
    def __init__(self, app_instance):
        self.app = app_instance
        self.configs = app_instance.configuracoes

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
            return

        planilha_final_renamed = self._unificar_e_tratar_dados(dados_validos, regras)
        
        try:
            self._gerar_relatorio_excel(planilha_final_renamed, pasta_out, regras)
        except Exception as e:
            self.app.log(f"Erro CRÍTICO ao salvar o arquivo Excel de saída: {e}", "ERROR"); return
        
        dashboard_path = self._gerar_dashboard_html(planilha_final_renamed, pasta_out, regras)
            
        stats = {"total": len(arquivos), "success": len(dados_validos), "errors": len(erros), 
                 "rows": len(planilha_final_renamed), "time": time.time() - start_time, 
                 "output_path": pasta_out, "dashboard_path": dashboard_path}
        
        self._finalizar_execucao(stats, erros, processo_nome, silent)

    def _validar_regras_config(self, regras):
        self.app.log("Validando regras do processo...", "INFO")
        erros_config = []
        colunas_definidas = set(regras.get("colunas_padrao", {}).keys())
        if not colunas_definidas: erros_config.append("A seção 'colunas_padrao' está vazia ou ausente.")
        for col in regras.get("colunas_essenciais", []):
            if col not in colunas_definidas: erros_config.append(f"Config: Coluna essencial '{col}' não definida em 'colunas_padrao'.")
        
        pivot = regras.get("tabela_dinamica", {})
        if pivot.get("criar"):
            for tipo_chave in ['valores', 'linhas', 'colunas']:
                for col in pivot.get(tipo_chave, []):
                    if col not in colunas_definidas: erros_config.append(f"Config (Tabela Dinâmica): Coluna '{col}' não definida em 'colunas_padrao'.")

        dashboard = regras.get("dashboard_interativo", {})
        if dashboard.get("criar"):
            for grafico in dashboard.get("graficos", []):
                for chave_coluna in ['x', 'y', 'nomes', 'valores']:
                    if chave_coluna in grafico and grafico[chave_coluna] not in colunas_definidas:
                        erros_config.append(f"Config (Dashboard): Coluna '{grafico[chave_coluna]}' do gráfico '{grafico.get('titulo')}' não definida em 'colunas_padrao'.")

        if erros_config:
            msg = "Processo abortado por erros de configuração:\n\n- " + "\n- ".join(erros_config)
            self.app.log(msg, "ERROR")
            if hasattr(self.app, 'update_idletasks'): messagebox.showerror("Erro de Configuração", msg)
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
                if df.empty: erros.append(f"{nome_arquivo}: Ignorado - Vazio."); continue
                if not all(col in df.columns for col in regras_essenciais_clean):
                    erros.append(f"{nome_arquivo}: Ignorado - Colunas essenciais ausentes."); continue
                df['arquivo_origem'] = nome_arquivo
                dados_validos.append(df)
            except Exception as e:
                erros.append(f"{nome_arquivo}: Erro - {e}")
        return dados_validos, erros

    def _unificar_e_tratar_dados(self, dados_validos, regras):
        self.app.log("Unificando dados...", "INFO")
        planilha_final = pd.concat(dados_validos, ignore_index=True)
        regras_colunas_orig = regras.get("colunas_padrao", {})
        regras_colunas_clean = {clean_name(k): v for k, v in regras_colunas_orig.items()}
        map_clean_to_orig = {clean_name(k): k for k in regras_colunas_orig.keys()}
        
        colunas_a_manter = list(regras_colunas_clean.keys()) + ['arquivo_origem']
        colunas_existentes = [col for col in colunas_a_manter if col in planilha_final.columns]
        planilha_final = planilha_final[colunas_existentes]
        planilha_final.dropna(how='all', subset=[c for c in list(regras_colunas_clean.keys()) if c in planilha_final.columns], inplace=True)
        return planilha_final.rename(columns=map_clean_to_orig)

    def _gerar_relatorio_excel(self, df, pasta_out, regras):
        with pd.ExcelWriter(pasta_out, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Dados Unificados', index=False)
            regras_pivot = regras.get("tabela_dinamica", {})
            if regras_pivot.get("criar"):
                try:
                    self.app.log("Criando tabela de resumo...", "INFO")
                    linhas, valores = regras_pivot.get('linhas', []), regras_pivot.get('valores', [])
                    for v_col in valores: df[v_col] = pd.to_numeric(df[v_col], errors='coerce')
                    resumo = df.groupby(linhas)[valores].agg(regras_pivot.get('agregacao', 'sum').lower()).reset_index()
                    resumo.to_excel(writer, sheet_name=regras_pivot.get('nome_aba', 'Resumo'), index=False)
                except Exception as e: self.app.log(f"Falha ao criar resumo: {e}", "WARNING")
        self.app.log("Ajustando colunas no Excel...", "INFO")
        auto_adjust_excel_columns(pasta_out)

    def _gerar_dashboard_html(self, df, pasta_out, regras):
        dash_regras = regras.get("dashboard_interativo", {})
        if not dash_regras.get("criar"): return None
        
        self.app.log("Gerando Dashboard Interativo...", "INFO")
        try:
            dashboard_html = f"<html><head><title>{dash_regras.get('titulo_dashboard', 'Dashboard')}</title>"
            dashboard_html += "<style>body{font-family: Arial, sans-serif; margin: 40px;} .plotly-graph-div{margin-bottom: 50px;}</style></head>"
            dashboard_html += f"<body><h1>{dash_regras.get('titulo_dashboard', 'Dashboard')}</h1>"

            for grafico_cfg in dash_regras.get("graficos", []):
                titulo = grafico_cfg.get("titulo")
                tipo = grafico_cfg.get("tipo")
                df_grafico = df.copy()

                agg_func = grafico_cfg.get("agregacao")
                if agg_func:
                    group_col = grafico_cfg.get("x") or grafico_cfg.get("nomes")
                    val_col = grafico_cfg.get("y") or grafico_cfg.get("valores")
                    df_grafico[val_col] = pd.to_numeric(df_grafico[val_col], errors='coerce').fillna(0)
                    df_grafico = df_grafico.groupby(group_col)[val_col].agg(agg_func).reset_index()

                fig = None
                if tipo == 'barra':
                    fig = px.bar(df_grafico, x=grafico_cfg.get("x"), y=grafico_cfg.get("y"), title=titulo, template="plotly_dark")
                elif tipo == 'pizza':
                    fig = px.pie(df_grafico, names=grafico_cfg.get("nomes"), values=grafico_cfg.get("y") or grafico_cfg.get("valores"), title=titulo, template="plotly_dark")
                
                if fig:
                    fig.update_layout(title_x=0.5)
                    dashboard_html += fig.to_html(full_html=False, include_plotlyjs='cdn')

            dashboard_html += "</body></html>"
            dashboard_path = os.path.splitext(pasta_out)[0] + "_Dashboard.html"
            with open(dashboard_path, 'w', encoding='utf-8') as f:
                f.write(dashboard_html)
            self.app.log(f"Dashboard salvo em: {dashboard_path}", "SUCCESS")
            return dashboard_path
        except Exception as e:
            self.app.log(f"Falha ao gerar dashboard: {e}", "ERROR")
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

# --- CLASSE DE VALIDAÇÃO DE PROPOSTAS ---
class ValidadorPropostas:
    def __init__(self, app_instance):
        self.app = app_instance

    class ValidadorPropostas:
    def __init__(self, app_instance):
        self.app = app_instance

    def run_validation_process(self, arquivo_unificado, arquivo_extrator, arquivo_saida):
        start_time = time.time()
        self.app.log("=== INICIANDO VALIDAÇÃO DE PROPOSTAS (v2) ===", "INFO")
        
        try:
            # --- CARREGAMENTO DOS ARQUIVOS ---
            self.app.log(f"Carregando arquivo unificado: {os.path.basename(arquivo_unificado)}", "INFO")
            df_unificado = ler_arquivo_simples(arquivo_unificado)
            
            self.app.log(f"Carregando arquivo extrator: {os.path.basename(arquivo_extrator)}", "INFO")
            df_extrator = ler_arquivo_simples(arquivo_extrator)

            # --- DEBUG: Mostrar as colunas como foram lidas ---
            self.app.log(f"Colunas do Unificado: {list(df_unificado.columns)}", "INFO")
            self.app.log(f"Colunas do Extrator: {list(df_extrator.columns)}", "INFO")

            # --- DEFINIÇÃO DOS NOMES DAS COLUNAS-CHAVE ---
            # Defina aqui os nomes EXATOS das colunas como aparecem nos arquivos
            coluna_proposta_unificado = 'Proposta'
            coluna_contrato_extrator = 'Número de Contrato'
            
            # --- VERIFICAÇÃO DAS COLUNAS ---
            if coluna_proposta_unificado not in df_unificado.columns:
                raise ValueError(f"Coluna '{coluna_proposta_unificado}' não encontrada no arquivo unificado!")
            if coluna_contrato_extrator not in df_extrator.columns:
                raise ValueError(f"Coluna '{coluna_contrato_extrator}' não encontrada no arquivo extrator!")
            
            # --- PROCESSO DE VALIDAÇÃO ROBUSTO ---
            self.app.log("Executando validação de propostas de forma robusta...", "INFO")
            
            # **MELHORIA PRINCIPAL:**
            # 1. Converte a coluna para texto (string).
            # 2. Remove espaços em branco do início e do fim (`.str.strip()`).
            # 3. Coloca tudo em um `set` para comparação ultra-rápida.
            self.app.log(f"Limpando e preparando a coluna '{coluna_contrato_extrator}' do extrator.", "INFO")
            contratos_extrator = set(df_extrator[coluna_contrato_extrator].dropna().astype(str).str.strip())
            
            # **Lógica de Aplicação Aprimorada**
            self.app.log(f"Comparando a coluna '{coluna_proposta_unificado}' contra os contratos do extrator.", "INFO")
            df_unificado['Status_Conta'] = df_unificado[coluna_proposta_unificado].astype(str).str.strip().apply(
                lambda x: 'CONTA ABERTA' if x in contratos_extrator else 'PENDENTE'
            )
            
            # --- CÁLCULO DAS ESTATÍSTICAS ---
            total_propostas = len(df_unificado)
            contas_abertas = len(df_unificado[df_unificado['Status_Conta'] == 'CONTA ABERTA'])
            contas_pendentes = total_propostas - contas_abertas
            taxa_sucesso = (contas_abertas / total_propostas * 100) if total_propostas > 0 else 0
            
            # --- SALVAR O RESULTADO ---
            self.app.log("Salvando relatório de validação...", "INFO")
            df_unificado.to_excel(arquivo_saida, index=False, engine='openpyxl')
            auto_adjust_excel_columns(arquivo_saida)
            
            tempo_execucao = time.time() - start_time
            
            stats = {
                'total_propostas': total_propostas, 'contas_abertas': contas_abertas,
                'contas_pendentes': contas_pendentes, 'taxa_sucesso': taxa_sucesso,
                'tempo': tempo_execucao, 'output_path': arquivo_saida
            }
            
            self.app.log(f"VALIDAÇÃO CONCLUÍDA COM SUCESSO!", "SUCCESS")
            self.app.log(f"Total: {total_propostas} | Abertas: {contas_abertas} | Pendentes: {contas_pendentes} | Taxa: {taxa_sucesso:.1f}%", "SUCCESS")
            
            self.app.after(100, lambda: ValidationSummaryWindow(self.app, stats))
            
        except Exception as e:
            # Exibir a exceção completa no log e na caixa de mensagem para fácil depuração
            import traceback
            error_details = traceback.format_exc()
            self.app.log(f"ERRO CRÍTICO na validação: {e}\n{error_details}", "ERROR")
            messagebox.showerror("Erro de Validação", f"Falha catastrófica na validação:\n\n{str(e)}")

# --- INTERFACE PRINCIPAL COM ABAS ---
class App(ctk.CTk):
    def __init__(self, configs):
        super().__init__()
        self.title("Central de Automação de Planilhas v15.0 - Validador de Propostas")
        self.geometry("900x750")
        ctk.set_appearance_mode("Dark")
        ctk.set_default_color_theme("blue")
        self.configuracoes = configs
        
        # Configuração da grid principal
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        # Criar TabView principal
        self.tabview = ctk.CTkTabview(self, anchor="nw")
        self.tabview.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        
        # Criar as abas
        self.tab_unificar = self.tabview.add("1. Unificar Relatórios")
        self.tab_validar = self.tabview.add("2. Validar Contas Abertas")
        
        # Configurar a aba de unificação (funcionalidade original)
        self.setup_unification_tab()
        
        # Configurar a aba de validação (nova funcionalidade)
        self.setup_validation_tab()
        
        # Configurar tags de log
        self.setup_log_tags()

    def setup_unification_tab(self):
        """Configura a aba de unificação com toda a funcionalidade original"""
        tab = self.tab_unificar
        
        # Configurar grid da aba
        tab.grid_columnconfigure(0, weight=1)
        tab.grid_rowconfigure(4, weight=1)
        
        processos = list(self.configuracoes.keys()) if self.configuracoes else ["Erro: config.json inválido"]
        
        # Process Frame
        process_frame = ctk.CTkFrame(tab)
        process_frame.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        process_frame.grid_columnconfigure(1, weight=1)
        ctk.CTkLabel(process_frame, text="1. Processo:", font=("Arial", 14, "bold")).grid(row=0, column=0, padx=10, pady=10)
        self.combo_processo = ctk.CTkComboBox(process_frame, values=processos)
        self.combo_processo.grid(row=0, column=1, padx=10, pady=10, sticky="ew")
        
        # Input Frame
        input_frame = ctk.CTkFrame(tab)
        input_frame.grid(row=1, column=0, padx=10, pady=5, sticky="ew")
        input_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(input_frame, text="2. Pasta de Entrada:", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky="w", columnspan=3, padx=10)
        self.entry_pasta = ctk.CTkEntry(input_frame)
        self.entry_pasta.grid(row=1, column=0, padx=(10,5), pady=5, sticky="ew")
        ctk.CTkButton(input_frame, text="📂", width=30, command=lambda: os.startfile(self.entry_pasta.get()) if self.entry_pasta.get() and os.path.isdir(self.entry_pasta.get()) else None).grid(row=1, column=1, pady=5)
        ctk.CTkButton(input_frame, text="Procurar...", command=self.selecionar_pasta).grid(row=1, column=2, padx=10, pady=5)
        
        # Output Frame
        output_frame = ctk.CTkFrame(tab)
        output_frame.grid(row=2, column=0, padx=10, pady=5, sticky="ew")
        output_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(output_frame, text="3. Arquivo de Saída:", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky="w", columnspan=3, padx=10)
        self.entry_saida = ctk.CTkEntry(output_frame)
        self.entry_saida.grid(row=1, column=0, padx=(10,5), pady=5, sticky="ew")
        ctk.CTkButton(output_frame, text="📂", width=30, command=lambda: os.startfile(os.path.dirname(self.entry_saida.get())) if self.entry_saida.get() and os.path.exists(os.path.dirname(self.entry_saida.get())) else None).grid(row=1, column=1, pady=5)
        ctk.CTkButton(output_frame, text="Salvar Como...", command=self.definir_arquivo_saida).grid(row=1, column=2, padx=10, pady=5)
        
        # Aux Actions
        aux_action_frame = ctk.CTkFrame(tab, fg_color="transparent")
        aux_action_frame.grid(row=3, column=0, padx=10, pady=5, sticky="ew")
        aux_action_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkButton(aux_action_frame, text="Testar Regras (Pré-visualizar)", command=self.open_preview_window).grid(row=0, column=0, padx=5, sticky="ew")
        
        # Log Frame
        log_frame = ctk.CTkFrame(tab)
        log_frame.grid(row=4, column=0, padx=10, pady=10, sticky="nsew")
        log_frame.grid_rowconfigure(0, weight=1)
        log_frame.grid_columnconfigure(0, weight=1)
        self.textbox_log = ctk.CTkTextbox(log_frame, state="disabled")
        self.textbox_log.grid(row=0, column=0, sticky="nsew")
        self.progressbar = ctk.CTkProgressBar(log_frame, mode='determinate')
        self.progressbar.grid(row=1, column=0, pady=5, sticky="ew")
        self.progressbar.set(0)
        
        # Botão Iniciar
        self.btn_iniciar = ctk.CTkButton(tab, text="INICIAR PROCESSAMENTO", command=self.iniciar_processamento_thread, 
                                        font=("Arial", 18, "bold"), height=50, fg_color="green", hover_color="darkgreen")
        self.btn_iniciar.grid(row=5, column=0, padx=10, pady=10, sticky="ew")

    def setup_validation_tab(self):
        """Configura a aba de validação com a nova funcionalidade"""
        tab = self.tab_validar
        
        # Configurar grid da aba
        tab.grid_columnconfigure(0, weight=1)
        tab.grid_rowconfigure(3, weight=1)
        
        # Título explicativo
        title_frame = ctk.CTkFrame(tab, fg_color="transparent")
        title_frame.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        ctk.CTkLabel(title_frame, text="VALIDADOR DE PROPOSTAS", font=("Arial", 18, "bold")).pack()
        ctk.CTkLabel(title_frame, text="Compare propostas unificadas com o extrator para determinar status das contas", 
                    font=("Arial", 12), text_color="gray").pack()
        
        # Widget Group 1: Relatório Unificado
        unif_frame = ctk.CTkFrame(tab)
        unif_frame.grid(row=1, column=0, padx=10, pady=5, sticky="ew")
        unif_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(unif_frame, text="Selecione o Relatório Unificado (saída do passo 1):", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky="w", columnspan=3, padx=10, pady=(10,5))
        self.entry_unificado = ctk.CTkEntry(unif_frame, placeholder_text="Arquivo Excel unificado...")
        self.entry_unificado.grid(row=1, column=0, padx=(10,5), pady=(0,10), sticky="ew")
        ctk.CTkButton(unif_frame, text="📂", width=30, command=lambda: os.startfile(os.path.dirname(self.entry_unificado.get())) if self.entry_unificado.get() and os.path.exists(os.path.dirname(self.entry_unificado.get())) else None).grid(row=1, column=1, pady=(0,10))
        ctk.CTkButton(unif_frame, text="Procurar...", command=self.selecionar_arquivo_unificado).grid(row=1, column=2, padx=10, pady=(0,10))
        
        # Widget Group 2: Extrator
        ext_frame = ctk.CTkFrame(tab)
        ext_frame.grid(row=2, column=0, padx=10, pady=5, sticky="ew")
        ext_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(ext_frame, text="Selecione o Extrator (relatório mestre de contas abertas):", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky="w", columnspan=3, padx=10, pady=(10,5))
        self.entry_extrator = ctk.CTkEntry(ext_frame, placeholder_text="Arquivo Excel/CSV do extrator...")
        self.entry_extrator.grid(row=1, column=0, padx=(10,5), pady=(0,10), sticky="ew")
        ctk.CTkButton(ext_frame, text="📂", width=30, command=lambda: os.startfile(os.path.dirname(self.entry_extrator.get())) if self.entry_extrator.get() and os.path.exists(os.path.dirname(self.entry_extrator.get())) else None).grid(row=1, column=1, pady=(0,10))
        ctk.CTkButton(ext_frame, text="Procurar...", command=self.selecionar_arquivo_extrator).grid(row=1, column=2, padx=10, pady=(0,10))
        
        # Widget Group 3: Arquivo de Saída
        output_val_frame = ctk.CTkFrame(tab)
        output_val_frame.grid(row=3, column=0, padx=10, pady=5, sticky="ew")
        output_val_frame.grid_columnconfigure(0, weight=1)
        ctk.CTkLabel(output_val_frame, text="Salvar Relatório de Validação Como:", font=("Arial", 14, "bold")).grid(row=0, column=0, sticky="w", columnspan=3, padx=10, pady=(10,5))
        self.entry_saida_validacao = ctk.CTkEntry(output_val_frame, placeholder_text="Relatório_Validacao.xlsx")
        self.entry_saida_validacao.grid(row=1, column=0, padx=(10,5), pady=(0,10), sticky="ew")
        ctk.CTkButton(output_val_frame, text="📂", width=30, command=lambda: os.startfile(os.path.dirname(self.entry_saida_validacao.get())) if self.entry_saida_validacao.get() and os.path.exists(os.path.dirname(self.entry_saida_validacao.get())) else None).grid(row=1, column=1, pady=(0,10))
        ctk.CTkButton(output_val_frame, text="Salvar Como...", command=self.definir_arquivo_saida_validacao).grid(row=1, column=2, padx=10, pady=(0,10))
        
        # Log da Validação
        log_val_frame = ctk.CTkFrame(tab)
        log_val_frame.grid(row=4, column=0, padx=10, pady=10, sticky="nsew")
        log_val_frame.grid_rowconfigure(0, weight=1)
        log_val_frame.grid_columnconfigure(0, weight=1)
        self.textbox_log_validacao = ctk.CTkTextbox(log_val_frame, state="disabled")
        self.textbox_log_validacao.grid(row=0, column=0, sticky="nsew")
        
        # Botão de Validação
        self.btn_validar = ctk.CTkButton(tab, text="INICIAR VALIDAÇÃO", command=self.iniciar_validacao_thread,
                                        font=("Arial", 18, "bold"), height=50, fg_color="#1E90FF", hover_color="#0066CC")
        self.btn_validar.grid(row=5, column=0, padx=10, pady=10, sticky="ew")

    def setup_log_tags(self):
        """Configura as tags de formatação para os logs"""
        for textbox in [self.textbox_log, self.textbox_log_validacao]:
            textbox.tag_config("INFO", foreground="white")
            textbox.tag_config("SUCCESS", foreground="#33FF33")
            textbox.tag_config("WARNING", foreground="yellow")
            textbox.tag_config("ERROR", foreground="#FF4444")

    def log(self, message, level="INFO"):
        """Log que escreve em ambas as abas"""
        level = level.upper()
        numeric_level = getattr(logging, level, logging.INFO)
        logging.log(numeric_level, message)
        
        # Escrever no log da aba atual
        current_tab = self.tabview.get()
        if "Unificar" in current_tab:
            textbox = self.textbox_log
        else:
            textbox = self.textbox_log_validacao
            
        textbox.configure(state="normal")
        textbox.insert("end", f"[{level}] {message}\n", level)
        textbox.configure(state="disabled")
        textbox.see("end")
        self.update_idletasks()

    # Métodos da aba de unificação (originais)
    def selecionar_pasta(self):
        path = filedialog.askdirectory(title="Selecione a Pasta de Entrada")
        if path: 
            self.entry_pasta.delete(0, 'end')
            self.entry_pasta.insert(0, path)

    def definir_arquivo_saida(self):
        path = filedialog.asksaveasfilename(title="Salvar Relatório Como...", initialfile="Relatorio_Unificado.xlsx", 
                                          defaultextension=".xlsx", filetypes=[("Planilhas Excel", "*.xlsx")])
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

    # Métodos da aba de validação (novos)
    def selecionar_arquivo_unificado(self):
        path = filedialog.askopenfilename(title="Selecione o Arquivo Unificado", 
                                        filetypes=[("Arquivos Excel", "*.xlsx"), ("Todos os arquivos", "*.*")])
        if path:
            self.entry_unificado.delete(0, 'end')
            self.entry_unificado.insert(0, path)

    def selecionar_arquivo_extrator(self):
        path = filedialog.askopenfilename(title="Selecione o Arquivo Extrator", 
                                        filetypes=[("Arquivos Excel", "*.xlsx"), ("Arquivos CSV", "*.csv"), ("Todos os arquivos", "*.*")])
        if path:
            self.entry_extrator.delete(0, 'end')
            self.entry_extrator.insert(0, path)

    def definir_arquivo_saida_validacao(self):
        path = filedialog.asksaveasfilename(title="Salvar Relatório de Validação Como...", 
                                          initialfile="Relatorio_Validacao.xlsx", 
                                          defaultextension=".xlsx", 
                                          filetypes=[("Planilhas Excel", "*.xlsx")])
        if path:
            self.entry_saida_validacao.delete(0, 'end')
            self.entry_saida_validacao.insert(0, path)

    def iniciar_validacao_thread(self):
        # Validações prévias
        if not all([self.entry_unificado.get(), self.entry_extrator.get(), self.entry_saida_validacao.get()]):
            return messagebox.showerror("Campos Obrigatórios", "Todos os três campos de arquivo devem ser preenchidos.")
        
        # Verificar se arquivos existem
        if not os.path.exists(self.entry_unificado.get()):
            return messagebox.showerror("Arquivo Não Encontrado", "Arquivo unificado não encontrado.")
        
        if not os.path.exists(self.entry_extrator.get()):
            return messagebox.showerror("Arquivo Não Encontrado", "Arquivo extrator não encontrado.")
        
        self.btn_validar.configure(state="disabled", text="Validando...")
        validador = ValidadorPropostas(self)
        thread = threading.Thread(target=validador.run_validation_process, 
                                args=(self.entry_unificado.get(), self.entry_extrator.get(), self.entry_saida_validacao.get()))
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
        messagebox.showerror("Erro Crítico", f"Arquivo 'config.json' não encontrado ou com erro.\n\n{e}")
        configs = {"Erro": {"colunas_padrao": {}}}
    
    app = App(configs)
    app.mainloop()
