from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from docxtpl import DocxTemplate
from babel.numbers import format_decimal
import pandas as pd
from datetime import datetime
import io
import os
import zipfile
import tempfile

app = FastAPI(title="Gerador RCDV API")

# CORS - permitir chamadas do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique o domínio do frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Caminhos dos templates (ajuste conforme seu deploy)
TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
TEMPLATE_SESI = os.path.join(TEMPLATE_DIR, "template_sesi.docx")
TEMPLATE_SENAI = os.path.join(TEMPLATE_DIR, "template_senai.docx")
PLANILHA_MODELO = os.path.join(os.path.dirname(__file__), "planilha_modelo.xlsx")


def render_documento(dados: dict, entidade: str) -> io.BytesIO:
    """Renderiza o documento DOCX baseado na entidade"""
    template_path = TEMPLATE_SESI if "SOCIAL" in entidade.upper() else TEMPLATE_SENAI
    template = DocxTemplate(template_path)
    template.render(dados)
    
    doc_buffer = io.BytesIO()
    template.save(doc_buffer)
    doc_buffer.seek(0)
    return doc_buffer


def process_order_data(prestacao_contas, ordem, entidade, projeto, gestor, contador, data_emissao):
    """Processa os dados de uma ordem e retorna o dicionário para o template"""
    prestacoes = prestacao_contas[prestacao_contas['Nº DA ORDEM'] == ordem]
    
    if prestacoes.empty:
        return None
    
    viajantes = prestacoes['NOME DO VIAJANTE'].unique()
    
    # Separar por rubrica
    prestacoes_hospedagem = prestacoes[prestacoes['RUBRICA'].str.upper().str.contains('HOSPEDAGE', na=False)]
    prestacoes_passagem = prestacoes[prestacoes['RUBRICA'].str.upper().str.contains('PASSAGE', na=False)]
    prestacoes_ajuda_custo = prestacoes[
        ~prestacoes['RUBRICA'].str.upper().str.contains('HOSPEDAGE', na=False) & 
        ~prestacoes['RUBRICA'].str.upper().str.contains('PASSAGE', na=False)
    ]
    
    # Calcular valores
    ajuda_custo_valor = prestacoes_ajuda_custo['VALOR UTILIZADO NO PROJETO'].sum()
    ajuda_custo_qnt = prestacoes_ajuda_custo['VALOR UTILIZADO NO PROJETO'].count()
    
    hospedagem_valor = prestacoes_hospedagem['VALOR UTILIZADO NO PROJETO'].sum()
    hospedagem_qnt = prestacoes_hospedagem['VALOR UTILIZADO NO PROJETO'].count()
    
    passagem_valor = prestacoes_passagem['VALOR UTILIZADO NO PROJETO'].sum()
    passagem_qnt = prestacoes_passagem['VALOR UTILIZADO NO PROJETO'].count()
    
    # Processar pessoas
    total_geral = 0
    pessoas = []
    for viajante in viajantes:
        total_individual = prestacoes[prestacoes['NOME DO VIAJANTE'] == viajante]['VALOR UTILIZADO NO PROJETO'].sum()
        cargo = prestacoes[prestacoes['NOME DO VIAJANTE'] == viajante]['CARGO'].iloc[0] if not prestacoes[prestacoes['NOME DO VIAJANTE'] == viajante].empty else '-'
        pessoa = {
            "nome": viajante,
            "cargo": cargo,
            "total_individual": format_decimal(total_individual, format='#,##0.00', locale='pt_BR')
        }
        total_geral += total_individual
        pessoas.append(pessoa)
    
    # Dados do documento
    numero_rcdv = int(prestacoes['Nº DA ORDEM'].iloc[0])
    evento = prestacoes['EVENTO'].iloc[0]
    periodo_viagem = prestacoes['PERÍODO DA VIAGEM '].iloc[0]
    local_viagem = prestacoes['LOCAL '].iloc[0]
    
    evento_str = str(evento) if not pd.isna(evento) else ""
    detalhe_objetivo_viagem = f"DESPESAS REFERENTES A {evento_str.upper().replace('EVENTO', '')}, NO PERÍODO DE {periodo_viagem}, NA CIDADE DE {local_viagem}."
    
    dados = {
        "numero_rcdv": str(numero_rcdv),
        "entidade": entidade,
        "projeto": projeto,
        "evento": str(evento),
        "data_emissao": data_emissao.strftime('%d/%m/%Y') if isinstance(data_emissao, datetime) else data_emissao,
        "rs_ajuda_custo": "R$" if ajuda_custo_qnt > 0 else "",
        "ajuda_custo_qtd": str(ajuda_custo_qnt) if ajuda_custo_qnt > 0 else "",
        "ajuda_custo_valor": format_decimal(ajuda_custo_valor, format='#,##0.00', locale='pt_BR') if ajuda_custo_qnt > 0 else "",
        "rs_passagem": "R$" if passagem_qnt > 0 else "",
        "passagem_qtd": str(passagem_qnt) if passagem_qnt > 0 else "",
        "passagem_valor": format_decimal(passagem_valor, format='#,##0.00', locale='pt_BR') if passagem_qnt > 0 else "",
        "rs_hospedagem": "R$" if hospedagem_qnt > 0 else "",
        "hospedagem_qtd": str(hospedagem_qnt) if hospedagem_qnt > 0 else "",
        "hospedagem_valor": format_decimal(hospedagem_valor, format='#,##0.00', locale='pt_BR') if hospedagem_qnt > 0 else "",
        "detalhe_objetivo_viagem": detalhe_objetivo_viagem,
        "total_geral": format_decimal(total_geral, format='#,##0.00', locale='pt_BR'),
        "nome_gestor": gestor,
        "nome_contador": contador,
        "pessoas": pessoas
    }
    
    return dados


@app.get("/")
async def root():
    return {"message": "Gerador RCDV API", "status": "online"}


@app.get("/download-modelo")
async def download_modelo():
    """Endpoint para baixar o modelo de planilha"""
    if not os.path.exists(PLANILHA_MODELO):
        raise HTTPException(status_code=404, detail="Modelo de planilha não encontrado")
    return FileResponse(
        PLANILHA_MODELO,
        filename="modelo_rcdv.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@app.post("/gerar-rcdv")
async def gerar_rcdv(
    planilha: UploadFile = File(...),
    projeto: str = Form(...),
    gestor: str = Form(...),
    contador: str = Form(...),
    entidade: str = Form(...),
    data_emissao: str = Form(...)
):
    """Endpoint principal para gerar os documentos RCDV"""
    try:
        # Ler a planilha
        contents = await planilha.read()
        excel_file = pd.ExcelFile(io.BytesIO(contents))
        prestacao_contas = pd.read_excel(excel_file, sheet_name=0)
        
        # Converter data
        try:
            data_emissao_dt = datetime.strptime(data_emissao, '%Y-%m-%d')
        except ValueError:
            data_emissao_dt = datetime.now()
        
        # Definir entidade completa
        if entidade.upper() == "SESI":
            entidade_completa = "SERVIÇO SOCIAL DA INDÚSTRIA"
        else:
            entidade_completa = "SERVIÇO NACIONAL DE APRENDIZAGEM INDUSTRIAL"
        
        # Recuperar ordens únicas
        ordens = prestacao_contas['Nº DA ORDEM'].unique()
        
        if len(ordens) == 0:
            raise HTTPException(status_code=400, detail="Nenhuma ordem encontrada na planilha")
        
        # Criar ZIP em memória
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            documentos_gerados = []
            
            for ordem in ordens:
                dados = process_order_data(
                    prestacao_contas=prestacao_contas,
                    ordem=ordem,
                    entidade=entidade_completa,
                    projeto=projeto,
                    gestor=gestor,
                    contador=contador,
                    data_emissao=data_emissao_dt
                )
                
                if dados is not None:
                    doc_buffer = render_documento(dados, entidade_completa)
                    filename = f"{dados['numero_rcdv']}.docx"
                    zip_file.writestr(filename, doc_buffer.getvalue())
                    documentos_gerados.append(filename)
        
        if not documentos_gerados:
            raise HTTPException(status_code=400, detail="Nenhum documento foi gerado")
        
        zip_buffer.seek(0)
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=rcdv_documentos.zip"}
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao processar: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)