import { useState } from 'react';
import { FileSpreadsheet, Download, Upload, FileText, CheckCircle, Loader2, Building2, Calendar, User, Users, ClipboardList, AlertCircle } from 'lucide-react';

// URL do backend - ajuste conforme seu deploy
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [formData, setFormData] = useState({
    projeto: '',
    gestor: '',
    contador: '',
    entidade: '',
    dataEmissao: ''
  });
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, done, error
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setStatus('idle');
      setError('');
    }
  };

  const handleDownloadModelo = async () => {
    try {
      const response = await fetch(`${API_URL}/download-modelo`);
      if (!response.ok) throw new Error('Erro ao baixar modelo');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo_rcdv.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao baixar o modelo de planilha');
    }
  };

  const handleGenerate = async () => {
    if (!file || !formData.projeto || !formData.gestor || !formData.contador || !formData.entidade || !formData.dataEmissao) {
      setError('Preencha todos os campos e faça upload da planilha');
      return;
    }
    
    setStatus('processing');
    setError('');
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('planilha', file);
      formDataToSend.append('projeto', formData.projeto);
      formDataToSend.append('gestor', formData.gestor);
      formDataToSend.append('contador', formData.contador);
      formDataToSend.append('entidade', formData.entidade);
      formDataToSend.append('data_emissao', formData.dataEmissao);
      
      const response = await fetch(`${API_URL}/gerar-rcdv`, {
        method: 'POST',
        body: formDataToSend
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erro ao gerar documentos');
      }
      
      // Download do ZIP
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rcdv_documentos.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Erro ao processar a planilha');
    }
  };

  const isFormValid = formData.projeto && formData.gestor && formData.contador && formData.entidade && formData.dataEmissao && file;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-2xl mb-4">
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Gerador de RCDV</h1>
          <p className="text-slate-400">Relatório Consolidado de Despesas de Viagem</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 space-y-6">
          
          {/* Download Template */}
          <div className="bg-slate-700/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-white font-medium">Modelo de Planilha</p>
                <p className="text-slate-400 text-sm">Baixe e preencha com os dados das viagens</p>
              </div>
            </div>
            <button 
              onClick={handleDownloadModelo}
              className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Baixar
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-slate-300 text-sm mb-2">
                <ClipboardList className="w-4 h-4" />
                Projeto
              </label>
              <input
                type="text"
                name="projeto"
                value={formData.projeto}
                onChange={handleInputChange}
                placeholder="Nome do projeto..."
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-slate-300 text-sm mb-2">
                  <User className="w-4 h-4" />
                  Gestor
                </label>
                <input
                  type="text"
                  name="gestor"
                  value={formData.gestor}
                  onChange={handleInputChange}
                  placeholder="Gestor do projeto..."
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-slate-300 text-sm mb-2">
                  <Users className="w-4 h-4" />
                  Contador
                </label>
                <input
                  type="text"
                  name="contador"
                  value={formData.contador}
                  onChange={handleInputChange}
                  placeholder="Contador do projeto..."
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-slate-300 text-sm mb-2">
                  <Building2 className="w-4 h-4" />
                  Entidade
                </label>
                <select
                  name="entidade"
                  value={formData.entidade}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="" className="bg-slate-800">Selecione...</option>
                  <option value="SESI" className="bg-slate-800">SESI - Serviço Social da Indústria</option>
                  <option value="SENAI" className="bg-slate-800">SENAI - Serviço Nacional de Aprendizagem Industrial</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-slate-300 text-sm mb-2">
                  <Calendar className="w-4 h-4" />
                  Data de Emissão
                </label>
                <input
                  type="date"
                  name="dataEmissao"
                  value={formData.dataEmissao}
                  onChange={handleInputChange}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="flex items-center gap-2 text-slate-300 text-sm mb-2">
              <Upload className="w-4 h-4" />
              Planilha de Viagens
            </label>
            <label className="block cursor-pointer">
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500'}`}>
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span className="text-white">{file.name}</span>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400">Clique ou arraste a planilha aqui</p>
                    <p className="text-slate-500 text-sm mt-1">.xlsx</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!isFormValid || status === 'processing'}
            className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              isFormValid && status !== 'processing'
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {status === 'processing' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando documentos...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Gerar RCDVs
              </>
            )}
          </button>

          {/* Success Message */}
          {status === 'done' && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <p className="text-emerald-400">Documentos gerados com sucesso! O download iniciou automaticamente.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          Gerador de Relatórios Consolidados de Despesas de Viagem
        </p>
      </div>
    </div>
  );
}