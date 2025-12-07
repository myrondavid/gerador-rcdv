# Gerador RCDV

Sistema para geração automatizada de Relatórios Consolidados de Despesas de Viagem (RCDV) para entidades SESI e SENAI.

## Visão Geral

O Gerador RCDV é uma aplicação web que permite gerar documentos Word (.docx) de relatórios de despesas de viagem a partir de planilhas Excel. O sistema processa dados de viagens, categoriza despesas (hospedagem, passagem, ajuda de custo) e gera documentos formatados prontos para uso.

## Estrutura do Projeto

```
gerador-rcdv/
├── backend/                 # API FastAPI
│   ├── main.py              # Aplicação principal
│   ├── templates/           # Templates Word (.docx)
│   │   ├── template_sesi.docx
│   │   └── template_senai.docx
│   ├── planilha_modelo.xlsx # Modelo de planilha
│   ├── requirements.txt     # Dependências Python
│   └── runtime.txt          # Versão do Python
│
├── frontend/                # Aplicação React
│   ├── src/
│   │   ├── main.jsx         # Entry point
│   │   └── App.jsx          # Componente principal
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## Tecnologias

### Backend
- **Framework:** FastAPI
- **Servidor:** Uvicorn (ASGI)
- **Python:** 3.10.12
- **Principais bibliotecas:**
  - `pandas` - Processamento de dados Excel
  - `openpyxl` - Leitura de arquivos Excel
  - `docxtpl` - Geração de documentos Word via templates
  - `babel` - Formatação de valores em pt_BR

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite 5
- **Estilização:** Tailwind CSS
- **Ícones:** Lucide React

## Instalação

### Pré-requisitos
- Python 3.10+
- Node.js 18+
- npm ou yarn

### Backend

```bash
cd backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
```

## Execução

### Backend

```bash
cd backend
python main.py
```
O servidor estará disponível em `http://localhost:8000`

### Frontend

```bash
cd frontend
npm run dev
```
A aplicação estará disponível em `http://localhost:5173`

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Health check - status da API |
| GET | `/download-modelo` | Download da planilha modelo |
| POST | `/gerar-rcdv` | Gerar documentos RCDV |

### POST /gerar-rcdv

**Parâmetros (FormData):**
- `planilha` - Arquivo Excel (.xlsx) com dados das despesas
- `projeto` - Nome do projeto
- `gestor` - Nome do gestor
- `contador` - Nome do contador
- `entidade` - "SESI" ou "SENAI"
- `data_emissao` - Data de emissão (YYYY-MM-DD)

**Resposta:** Arquivo ZIP contendo os documentos .docx gerados

## Estrutura da Planilha

A planilha de entrada deve conter as seguintes colunas:

| Coluna | Descrição |
|--------|-----------|
| Nº DA ORDEM | Número da ordem de viagem |
| NOME DO VIAJANTE | Nome completo do viajante |
| CARGO | Cargo do viajante |
| RUBRICA | Categoria da despesa (HOSPEDAGEM, PASSAGEM, ou outro) |
| VALOR UTILIZADO NO PROJETO | Valor da despesa |
| EVENTO | Nome do evento |
| PERÍODO DA VIAGEM | Período da viagem |
| LOCAL | Local da viagem |

## Funcionalidades

- Download de planilha modelo para preenchimento
- Upload de planilha com dados de despesas
- Seleção de entidade (SESI/SENAI)
- Geração automática de documentos Word
- Categorização de despesas por rubrica
- Formatação de valores em moeda brasileira (R$)
- Download de documentos em arquivo ZIP

## Scripts Disponíveis

### Frontend

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
```

## Variáveis de Ambiente

### Frontend (.env)

```env
VITE_API_URL=http://localhost:8000
```

## Licença

Projeto desenvolvido para uso interno FIEA.
