import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import MetricCards from './components/MetricCards.jsx';
import Filters from './components/Filters.jsx';
import Tabs from './components/Tabs.jsx';
import MedidasTable from './components/MedidasTable.jsx';
import SituacaoCards from './components/SituacaoCards.jsx';
import MedidasBarChart from './components/MedidasBarChart.jsx';
import ChipMultiFilter from './components/ChipMultiFilter.jsx';
import InconsistenciasTable from './components/InconsistenciasTable.jsx';
import HistoricoStackedBarChart from './components/HistoricoStackedBarChart.jsx';
import ProdutividadeBarChart from './components/ProdutividadeBarChart.jsx';
import './styles/app.css';

// Paleta validada (dataviz skill, validate_palette.js, modo claro — todos os
// checks passam): aprovado em verde, reprovado/cancelado em tons de vermelho,
// por pedido explícito de manter a semântica de status já usada no app.
const CATEGORIAS_APROVACAO = [
  { key: 'APROVADO', label: 'Aprovado', color: '#2f9e6e' },
  { key: 'REPROVADO', label: 'Reprovado', color: '#e0663f' },
  { key: 'CANCELADO', label: 'Cancelado', color: '#a02b2b' },
];

// Paleta nova (também validada), reaproveitando tons já usados na identidade
// do app (azul do gráfico de medidas, verde do gradiente Cemig, âmbar de "vence em breve").
const CATEGORIAS_LIBERACAO = [
  { key: 'COM_OBRAS', label: 'Com obras', color: '#2a78d6' },
  { key: 'SEM_OBRAS', label: 'Sem obras', color: '#3d9b3d' },
  { key: 'SERVICOS_REDE', label: 'Serviços na rede', color: '#8a5a0b' },
];

// Reaproveita cores já validadas em uso no app (não geradas de novo — o
// validador da skill dataviz não está disponível neste ambiente): verde de
// APROVADO (positivo/meta atingida), âmbar de SERVICOS_REDE (atenção/pendente),
// cinza neutro já usado pra "Outros"/catch-all no gráfico de produtividade.

const CATEGORIAS_UNIVERSALIZACAO = [{ key: 'UNIVERSALIZADA', label: 'Universalizada', color: '#2f9e6e' },{ key: 'NAO_UNIVERSALIZADA', label: 'Não universalizada', color: '#8a5a0b' },{ key: 'FORA_UNIVERSALIZACAO', label: 'Fora da universalização', color: '#2a78d6' },{ key: 'SEGURANCA', label: 'Obras de segurança', color: '#a02b2b' },{ key: 'OUTROS', label: 'Outros', color: '#898781' },];

const SITUACOES_VENCIMENTO = [
  'PENDENTES',
  'EM ATRASO',
  'VENCE HOJE',
  'VENCE 7 DIAS',
  'NO PRAZO',
  'SEM VENCIMENTO REGULATÓRIO',
];

export default function App() {
  const [rows, setRows] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [resumoGrupo2, setResumoGrupo2] = useState([]);
  const [resumo0070Regional, setResumo0070Regional] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [servicosSelecionados, setServicosSelecionados] = useState([]);
  const [regionais, setRegionais] = useState([]);
  const [regionaisSelecionadas, setRegionaisSelecionadas] = useState([]);
  const [historicoRegionaisSelecionadas, setHistoricoRegionaisSelecionadas] = useState([]);
  const [medidasGrupo1, setMedidasGrupo1] = useState([]);
  const [medidasGrupo2, setMedidasGrupo2] = useState([]);
  const [medidasSelecionadas, setMedidasSelecionadas] = useState([]);
  const [medidasInicializado, setMedidasInicializado] = useState(false);
  const [situacoesSelecionadas, setSituacoesSelecionadas] = useState(SITUACOES_VENCIMENTO);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('lista');
  // Filtro de medida disparado pelos cards de métrica.
  const [cardFiltroAtivo, setCardFiltroAtivo] = useState(null);

  // Aba "Inconsistências": regra de negócio independente, sem relação com os
  // filtros de status/medida/card acima — busca uma vez só, filtro local.
  const [inconsistencias, setInconsistencias] = useState([]);
  const [inconsistenciasLoading, setInconsistenciasLoading] = useState(true);
  const [inconsistenciasError, setInconsistenciasError] = useState(null);
  const [tiposInconsistencia, setTiposInconsistencia] = useState([]);
  const [tiposSelecionados, setTiposSelecionados] = useState([]);
  const [atualizacaoPublica, setAtualizacaoPublica] = useState({ status: 'idle' });

  // Aba "Histórico": gráficos de aprovação/liberação são independentes dos
  // filtros acima — busca uma vez só, sem relação com área/status/medida/card.
  // servico/mercado são filtros próprios da aba, compartilhados pelos 3 gráficos.
  const [historicoAprovacao, setHistoricoAprovacao] = useState([]);
  const [historicoLiberacao, setHistoricoLiberacao] = useState([]);
  const [historicoUniversalizacao, setHistoricoUniversalizacao] = useState([]);
  const [historicoLoading, setHistoricoLoading] = useState(true);
  const [historicoError, setHistoricoError] = useState(null);
  // Opções disponíveis de serviço/mercado da aba Histórico vêm do backend
  // (regrasHistorico, mesma fonte usada pelo script de exportação estática),
  // igual já é feito com "regionais" acima — evita duplicar essas listas aqui.
  const [historicoServicosDisponiveis, setHistoricoServicosDisponiveis] = useState([]);
  const [historicoServicoInicializado, setHistoricoServicoInicializado] = useState(false);
  const [historicoMercadosDisponiveis, setHistoricoMercadosDisponiveis] = useState([]);
  const [historicoMercadoInicializado, setHistoricoMercadoInicializado] = useState(false);
  // ChipMultiFilter trabalha com array de selecionadas. Serviço começa só com
  // COMT (preserva o comportamento/carga de antes); "Todos" soma os
  // códigos disponíveis (servico vira lista pro backend, sem default implícito).
  const [historicoServicoSelecionado, setHistoricoServicoSelecionado] = useState([]);
  const historicoServico = historicoServicoSelecionado.join(',');
  // As opções de mercado marcadas (padrão) equivalem a "Todos" = sem
  // filtro de mercado no backend.
  const [historicoMercadoSelecionado, setHistoricoMercadoSelecionado] = useState([]);
  const historicoMercado = historicoMercadoSelecionado.length === 1 ? historicoMercadoSelecionado[0] : '';

  // Gráfico de produtividade tem filtro próprio de medida (independente dos
  // outros dois gráficos do Histórico) — busca separada, refeita a cada mudança.
  const [historicoProdutividade, setHistoricoProdutividade] = useState([]);
  const [historicoProdutividadeTopN, setHistoricoProdutividadeTopN] = useState(10);
  const [produtividadeMedidasDisponiveis, setProdutividadeMedidasDisponiveis] = useState([]);
  const [produtividadeMedidasSelecionadas, setProdutividadeMedidasSelecionadas] = useState([]);
  const [produtividadeMedidasInicializado, setProdutividadeMedidasInicializado] = useState(false);
  const [produtividadeLoading, setProdutividadeLoading] = useState(true);
  const [produtividadeError, setProdutividadeError] = useState(null);

  // Aba "Orçamentos emitíveis": lista independente (medida fixa, 0080 com
  // 0070 concluída) — reaproveita as opções de serviço/regional já buscadas
  // acima (servicos/regionais), só com seleção própria.
  const [orcamentos, setOrcamentos] = useState([]);
  const [orcamentosLoading, setOrcamentosLoading] = useState(true);
  const [orcamentosError, setOrcamentosError] = useState(null);
  const [orcamentosServicosSelecionados, setOrcamentosServicosSelecionados] = useState([]);
  const [orcamentosServicosInicializado, setOrcamentosServicosInicializado] = useState(false);
  const [orcamentosRegionaisSelecionadas, setOrcamentosRegionaisSelecionadas] = useState([]);
  const [orcamentosSituacaoAtiva, setOrcamentosSituacaoAtiva] = useState(null);

  function handleOrcamentosSituacaoClick(situacao) {
    setOrcamentosSituacaoAtiva((atual) => (atual === situacao ? null : situacao));
  }

  const orcamentosFiltrados = useMemo(
    () => (orcamentosSituacaoAtiva ? orcamentos.filter((row) => row.DES_SITUACAO === orcamentosSituacaoAtiva) : orcamentos),
    [orcamentos, orcamentosSituacaoAtiva],
  );

  function limparFiltros() {
    setServicosSelecionados(servicos);
    setRegionaisSelecionadas(regionais);
    setMedidasSelecionadas(medidasGrupo1);
    setSituacoesSelecionadas(SITUACOES_VENCIMENTO);
    setCardFiltroAtivo(null);
  }

  function handleCardClick(filterKey, medidasDoCard) {
    if (cardFiltroAtivo === filterKey) {
      setCardFiltroAtivo(null);
      setMedidasSelecionadas(medidasGrupo1);
      return;
    }
    setCardFiltroAtivo(filterKey);
    setMedidasSelecionadas(medidasDoCard);
  }

  async function atualizarPainelPublico() {
    if (!window.confirm('Atualizar os dados do painel externo agora?')) return;
    try {
      const resp = await fetch('/api/painel-publico/atualizar', { method: 'POST' });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Não foi possível iniciar a atualização.');
      setAtualizacaoPublica(json.data);
    } catch (err) {
      setAtualizacaoPublica({ status: 'error', error: err.message });
    }
  }

  useEffect(() => {
    if (atualizacaoPublica.status !== 'running') return undefined;
    const timer = window.setInterval(async () => {
      const resp = await fetch('/api/painel-publico/atualizacao');
      if (!resp.ok) return;
      const json = await resp.json();
      setAtualizacaoPublica(json.data);
      if (json.data.status !== 'running') window.clearInterval(timer);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [atualizacaoPublica.status]);

  async function carregarDados() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (servicosSelecionados.length !== servicos.length) {
        params.set('servico', servicosSelecionados.join(','));
      }
      if (regionaisSelecionadas.length !== regionais.length) {
        params.set('regional', regionaisSelecionadas.join(','));
      }
      // Só manda "medidas" quando o usuário desmarcou alguma opção — com tudo
      // marcado o comportamento é o mesmo de não filtrar (usa o grupo 1 padrão do backend).
      if (medidasInicializado && medidasSelecionadas.length !== medidasGrupo1.length) {
        params.set('medidas', medidasSelecionadas.join(','));
      }
      // Atalhos dos cards de métrica — combinam com os filtros acima (AND no backend).
      if (situacoesSelecionadas.length !== SITUACOES_VENCIMENTO.length) {
        params.set('situacao', situacoesSelecionadas.join(','));
      }
      if (cardFiltroAtivo === 'atraso') params.set('situacao', 'EM ATRASO');
      if (cardFiltroAtivo === 'grupo2') params.set('grupo2', 'SIM');
      const qs = params.toString();

      // O resumo do grupo 2 só reaproveita área/status (medidas do grupo 1 e os
      // atalhos de card não fazem sentido nele — os códigos já são fixos e a
      // ideia é agregar as medidas do grupo 2 em si, não notas do grupo 1).
      const paramsGrupo2 = new URLSearchParams();
      if (servicosSelecionados.length !== servicos.length) {
        paramsGrupo2.set('servico', servicosSelecionados.join(','));
      }
      if (regionaisSelecionadas.length !== regionais.length) {
        paramsGrupo2.set('regional', regionaisSelecionadas.join(','));
      }
      const qsGrupo2 = paramsGrupo2.toString();

      const [respMedidas, respResumo, respResumoGrupo2, respResumo0070] = await Promise.all([
        fetch(`/api/medidas?${qs}`),
        fetch(`/api/medidas/resumo?${qs}`),
        fetch(`/api/medidas/resumo-grupo2?${qsGrupo2}`),
        fetch(`/api/medidas/resumo-0070-regional?${qsGrupo2}`),
      ]);
      if (!respMedidas.ok) throw new Error(`Falha na API (${respMedidas.status})`);
      if (!respResumo.ok) throw new Error(`Falha na API do resumo (${respResumo.status})`);
      if (!respResumoGrupo2.ok) throw new Error(`Falha na API do resumo grupo 2 (${respResumoGrupo2.status})`);
      if (!respResumo0070.ok) throw new Error(`Falha na API da medida 0070 (${respResumo0070.status})`);

      const json = await respMedidas.json();
      const jsonResumo = await respResumo.json();
      const jsonResumoGrupo2 = await respResumoGrupo2.json();
      const jsonResumo0070 = await respResumo0070.json();
      setRows(json.data);
      setResumo(jsonResumo.data);
      setResumoGrupo2(jsonResumoGrupo2.data);
      setResumo0070Regional(jsonResumo0070.data);

      if (json.regrasNegocio?.grupo1Medidas?.length) {
        setMedidasGrupo1(json.regrasNegocio.grupo1Medidas);
        if (!medidasInicializado) {
          setMedidasSelecionadas(json.regrasNegocio.grupo1Medidas);
          setMedidasInicializado(true);
        }
      }
      if (json.regrasNegocio?.grupo2Medidas?.length) {
        setMedidasGrupo2(json.regrasNegocio.grupo2Medidas);
      }
      if (json.regrasNegocio?.codServicoFiltro?.length) {
        const servicosDisponiveis = json.regrasNegocio.codServicoFiltro;
        const servicosIniciais = servicosDisponiveis.filter((servico) => !['PSAA', 'PSAI'].includes(servico));
        setServicos(servicosDisponiveis);
        if (!servicos.length) setServicosSelecionados(servicosIniciais);
      }

      // Só repopula as opções dos dropdowns a partir do carregamento sem filtro
      // nenhum — senão, ao selecionar uma área, o próprio dropdown encolheria
      // para mostrar só as opções presentes no resultado já filtrado.
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medidasSelecionadas, servicosSelecionados, regionaisSelecionadas, situacoesSelecionadas, cardFiltroAtivo]);

  useEffect(() => {
    async function carregarOpcoes() {
      try {
        const resp = await fetch('/api/medidas/opcoes');
        if (!resp.ok) throw new Error(`Falha ao carregar opções (${resp.status})`);
        const json = await resp.json();
        const regionaisDisponiveis = json.regionais || [];
        setRegionais(regionaisDisponiveis);
        setRegionaisSelecionadas(regionaisDisponiveis);
        setHistoricoRegionaisSelecionadas(regionaisDisponiveis);
        setOrcamentosRegionaisSelecionadas(regionaisDisponiveis);
      } catch (err) {
        setError(err.message);
      }
    }
    carregarOpcoes();
  }, []);

  useEffect(() => {
    // Data/hora de atualização do banco: temporário, buscado uma vez só (não
    // depende dos filtros da tabela). Se falhar, simplesmente não mostra a linha.
    fetch('/api/ultima-atualizacao')
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((json) => setUltimaAtualizacao(json?.data ?? null))
      .catch(() => setUltimaAtualizacao(null));
  }, []);

  useEffect(() => {
    async function carregarInconsistencias() {
      setInconsistenciasLoading(true);
      setInconsistenciasError(null);
      try {
        const resp = await fetch('/api/inconsistencias');
        if (!resp.ok) throw new Error(`Falha na API (${resp.status})`);
        const json = await resp.json();
        setInconsistencias(json.data);
        const tipos = [...new Set(json.data.map((r) => r.TIPO_INCONSISTENCIA))];
        setTiposInconsistencia(tipos);
        setTiposSelecionados((atual) => (atual.length === 0 ? tipos : atual));
      } catch (err) {
        setInconsistenciasError(err.message);
      } finally {
        setInconsistenciasLoading(false);
      }
    }
    carregarInconsistencias();
  }, []);

  useEffect(() => {
    async function carregarHistorico() {
      setHistoricoLoading(true);
      setHistoricoError(null);
      try {
        const params = new URLSearchParams();
        params.set('servico', historicoServico);
        if (historicoMercado) params.set('mercado', historicoMercado);
        params.set('regional', historicoRegionaisSelecionadas.join(','));
        const qs = params.toString();
        const [respAprovacao, respLiberacao, respUniversalizacao] = await Promise.all([
          fetch(`/api/historico/aprovacao?${qs}`),
          fetch(`/api/historico/liberacao?${qs}`),
          fetch(`/api/historico/universalizacao?${qs}`),
        ]);
        if (!respAprovacao.ok) throw new Error(`Falha na API de aprovação (${respAprovacao.status})`);
        if (!respLiberacao.ok) throw new Error(`Falha na API de liberação (${respLiberacao.status})`);
        if (!respUniversalizacao.ok) throw new Error(`Falha na API de universalização (${respUniversalizacao.status})`);
        const jsonAprovacao = await respAprovacao.json();
        const jsonLiberacao = await respLiberacao.json();
        const jsonUniversalizacao = await respUniversalizacao.json();
        setHistoricoAprovacao(jsonAprovacao.data);
        setHistoricoLiberacao(jsonLiberacao.data);
        setHistoricoUniversalizacao(jsonUniversalizacao.data);

        // Os 3 endpoints compartilham a mesma regrasHistorico — basta ler de um.
        if (jsonAprovacao.regrasNegocio?.servicosDisponiveis?.length) {
          const disponiveis = jsonAprovacao.regrasNegocio.servicosDisponiveis;
          setHistoricoServicosDisponiveis(disponiveis);
          if (!historicoServicoInicializado) {
            setHistoricoServicoSelecionado(disponiveis.filter((s) => s !== 'PSAA' && s !== 'PSAI'));
            setHistoricoServicoInicializado(true);
          }
        }
        if (jsonAprovacao.regrasNegocio?.mercadosDisponiveis?.length) {
          const disponiveis = jsonAprovacao.regrasNegocio.mercadosDisponiveis;
          setHistoricoMercadosDisponiveis(disponiveis);
          if (!historicoMercadoInicializado) {
            setHistoricoMercadoSelecionado(disponiveis);
            setHistoricoMercadoInicializado(true);
          }
        }
      } catch (err) {
        setHistoricoError(err.message);
      } finally {
        setHistoricoLoading(false);
      }
    }
    carregarHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historicoServico, historicoMercado, historicoRegionaisSelecionadas]);

  useEffect(() => {
    async function carregarProdutividade() {
      setProdutividadeLoading(true);
      setProdutividadeError(null);
      try {
        const params = new URLSearchParams();
        params.set('servico', historicoServico);
        if (historicoMercado) params.set('mercado', historicoMercado);
        params.set('regional', historicoRegionaisSelecionadas.join(','));
        // Só manda "medidas" quando o usuário desmarcou alguma opção — com
        // tudo marcado o comportamento é o mesmo de não filtrar (backend usa
        // as 6 medidas padrão configuradas).
        if (
          produtividadeMedidasInicializado &&
          produtividadeMedidasSelecionadas.length !== produtividadeMedidasDisponiveis.length
        ) {
          params.set('medidas', produtividadeMedidasSelecionadas.join(','));
        }
        const qs = params.toString();
        const resp = await fetch(`/api/historico/produtividade${qs ? `?${qs}` : ''}`);
        if (!resp.ok) throw new Error(`Falha na API de produtividade (${resp.status})`);
        const json = await resp.json();
        setHistoricoProdutividade(json.data);

        if (json.regrasNegocio?.produtividade?.medidas?.length) {
          setProdutividadeMedidasDisponiveis(json.regrasNegocio.produtividade.medidas);
          if (!produtividadeMedidasInicializado) {
            setProdutividadeMedidasSelecionadas(json.regrasNegocio.produtividade.medidas);
            setProdutividadeMedidasInicializado(true);
          }
        }
        if (json.regrasNegocio?.produtividade?.topN) {
          setHistoricoProdutividadeTopN(json.regrasNegocio.produtividade.topN);
        }
      } catch (err) {
        setProdutividadeError(err.message);
      } finally {
        setProdutividadeLoading(false);
      }
    }
    carregarProdutividade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtividadeMedidasSelecionadas, historicoServico, historicoMercado, historicoRegionaisSelecionadas]);

  useEffect(() => {
    // "servicos" já é buscado pra aba Lista (carregarDados) — só espera
    // popular pra definir a seleção inicial desta aba, sem refazer a chamada.
    if (servicos.length && !orcamentosServicosInicializado) {
      setOrcamentosServicosSelecionados(servicos.filter((s) => !['PSAA', 'PSAI'].includes(s)));
      setOrcamentosServicosInicializado(true);
    }
  }, [servicos, orcamentosServicosInicializado]);

  async function carregarOrcamentos() {
    setOrcamentosLoading(true);
    setOrcamentosError(null);
    try {
      const params = new URLSearchParams();
      if (orcamentosServicosSelecionados.length !== servicos.length) {
        params.set('servico', orcamentosServicosSelecionados.join(','));
      }
      if (orcamentosRegionaisSelecionadas.length !== regionais.length) {
        params.set('regional', orcamentosRegionaisSelecionadas.join(','));
      }
      const qs = params.toString();
      const resp = await fetch(`/api/orcamentos-emitiveis?${qs}`);
      if (!resp.ok) throw new Error(`Falha na API (${resp.status})`);
      const json = await resp.json();
      setOrcamentos(json.data);
    } catch (err) {
      setOrcamentosError(err.message);
    } finally {
      setOrcamentosLoading(false);
    }
  }

  useEffect(() => {
    carregarOrcamentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentosServicosSelecionados, orcamentosRegionaisSelecionadas]);

  const metrics = useMemo(() => {
    const contarMedidas = (codigos) => rows.filter((row) => codigos.includes(row.COD_MEDIDA)).length;
    return {
      analiseInicial: contarMedidas(['0019']),
      analiseConexao: contarMedidas(['0020', '0021']),
      orcamento: contarMedidas(['0080']),
      orcamentoEstimado: contarMedidas(['0032', '0086']),
    };
  }, [rows]);

  const inconsistenciasFiltradas = useMemo(
    () => inconsistencias.filter((r) => tiposSelecionados.includes(r.TIPO_INCONSISTENCIA)),
    [inconsistencias, tiposSelecionados],
  );

  const renderFiltrosMedidas = () => (
    <>
      <Filters
      servicos={servicos}
      servicosSelecionados={servicosSelecionados}
      onServicosChange={setServicosSelecionados}
      regionais={regionais}
      regionaisSelecionadas={regionaisSelecionadas}
      onRegionaisChange={setRegionaisSelecionadas}
      medidasGrupo1={medidasGrupo1}
      medidasSelecionadas={medidasSelecionadas}
      onMedidasChange={setMedidasSelecionadas}
      situacoesVencimento={SITUACOES_VENCIMENTO}
      situacoesSelecionadas={situacoesSelecionadas}
      onSituacoesChange={setSituacoesSelecionadas}
      cardFiltroAtivo={cardFiltroAtivo}
      onLimpar={limparFiltros}
      />
      <div className="filters-help">Clique isola; Ctrl/Cmd+clique combina</div>
    </>
  );

  const renderCardsMedidas = () => (
    <MetricCards
      metrics={metrics}
      loading={loading}
      cardFiltroAtivo={cardFiltroAtivo}
      onCardClick={handleCardClick}
    />
  );

  return (
    <>
      <Header
        ultimaAtualizacao={ultimaAtualizacao}
        atualizacaoPublica={atualizacaoPublica}
        onAtualizarPublico={atualizarPainelPublico}
      />
      <main className="app-main">
        {(abaAtiva === 'lista' || abaAtiva === 'graficos') && (
          <>
            {(abaAtiva === 'lista' || abaAtiva === 'graficos') && renderCardsMedidas()}
            {renderFiltrosMedidas()}
            {error && <div className="error-banner">Erro ao carregar dados: {error}</div>}
          </>
        )}

        <Tabs abaAtiva={abaAtiva} onChange={setAbaAtiva} />

        {abaAtiva === 'lista' && <MedidasTable rows={rows} loading={loading} />}

        {abaAtiva === 'graficos' && (
          <>
            <MedidasBarChart
              titulo="Medidas pendentes por situação de vencimento"
              resumo={resumo}
              codigos={medidasSelecionadas.length ? medidasSelecionadas : medidasGrupo1}
              situacaoList={SITUACOES_VENCIMENTO}
              loading={loading}
              controlesFullscreen={renderFiltrosMedidas()}
              cardsFullscreen={renderCardsMedidas()}
            />
            <MedidasBarChart
              titulo="Medida 0070 por Regional"
              resumo={resumo0070Regional}
              codigos={[]}
              categorias={regionaisSelecionadas.length ? regionaisSelecionadas : regionais}
              campoCategoria="REGIONAL"
              situacaoList={SITUACOES_VENCIMENTO}
              loading={loading}
              controlesFullscreen={renderFiltrosMedidas()}
              cardsFullscreen={renderCardsMedidas()}
            />
            <MedidasBarChart
              titulo="Medidas pendentes por situação de vencimento — Áreas envolvidas"
              resumo={resumoGrupo2}
              codigos={medidasGrupo2}
              situacaoList={SITUACOES_VENCIMENTO}
              loading={loading}
              controlesFullscreen={renderFiltrosMedidas()}
              cardsFullscreen={renderCardsMedidas()}
            />
          </>
        )}

        {abaAtiva === 'inconsistencias' && (
          <>
            <section className="filters-bar">
              <ChipMultiFilter
                label="Tipo de inconsistência"
                opcoes={tiposInconsistencia}
                selecionadas={tiposSelecionados}
                onChange={setTiposSelecionados}
                wrapperClassName="filters-bar__field filters-bar__field--full"
              />
            </section>
            {inconsistenciasError && (
              <div className="error-banner">Erro ao carregar dados: {inconsistenciasError}</div>
            )}
            <InconsistenciasTable rows={inconsistenciasFiltradas} loading={inconsistenciasLoading} />
          </>
        )}

        {abaAtiva === 'historico' && (
          <>
            <section className="filters-bar">
              <ChipMultiFilter
                label="Serviço"
                opcoes={historicoServicosDisponiveis}
                selecionadas={historicoServicoSelecionado}
                onChange={setHistoricoServicoSelecionado}
                wrapperClassName="filters-bar__field filters-bar__field--full"
              />
              <ChipMultiFilter
                label="Regional"
                opcoes={regionais}
                selecionadas={historicoRegionaisSelecionadas}
                onChange={setHistoricoRegionaisSelecionadas}
                wrapperClassName="filters-bar__field filters-bar__field--full"
              />
              <ChipMultiFilter
                label="Mercado"
                opcoes={historicoMercadosDisponiveis}
                selecionadas={historicoMercadoSelecionado}
                onChange={setHistoricoMercadoSelecionado}
                wrapperClassName="filters-bar__field"
              />
            </section>
            {historicoError && <div className="error-banner">Erro ao carregar dados: {historicoError}</div>}
            <HistoricoStackedBarChart
              titulo="Aprovação de pedidos (medida 0019)"
              linhas={historicoAprovacao}
              categorias={CATEGORIAS_APROVACAO}
              campoCategoria="CATEGORIA"
              loading={historicoLoading}
            />
            <HistoricoStackedBarChart
              titulo="Tipo de liberação (medidas 0590 / 0550 / 0501)"
              linhas={historicoLiberacao}
              categorias={CATEGORIAS_LIBERACAO}
              campoCategoria="TIPO"
              loading={historicoLoading}
            />
            <HistoricoStackedBarChart
              titulo="Universalização de obras (medida 0590)"
              linhas={historicoUniversalizacao}
              categorias={CATEGORIAS_UNIVERSALIZACAO}
              campoCategoria="CATEGORIA"
              loading={historicoLoading}
            />
            <section className="filters-bar">
              <ChipMultiFilter
                label="Produtividade — filtrar por medida"
                opcoes={produtividadeMedidasDisponiveis}
                selecionadas={produtividadeMedidasSelecionadas}
                onChange={setProdutividadeMedidasSelecionadas}
                wrapperClassName="filters-bar__field filters-bar__field--full"
              />
            </section>
            {produtividadeError && (
              <div className="error-banner">Erro ao carregar dados: {produtividadeError}</div>
            )}
            <ProdutividadeBarChart
              titulo="Produtividade por matrícula"
              linhas={historicoProdutividade}
              topN={historicoProdutividadeTopN}
              loading={produtividadeLoading}
            />
          </>
        )}

        {abaAtiva === 'orcamentos' && (
          <>
            <section className="filters-bar">
              <ChipMultiFilter
                label="Serviço"
                opcoes={servicos}
                selecionadas={orcamentosServicosSelecionados}
                onChange={setOrcamentosServicosSelecionados}
                wrapperClassName="filters-bar__field filters-bar__field--full"
              />
              <ChipMultiFilter
                label="Regional"
                opcoes={regionais}
                selecionadas={orcamentosRegionaisSelecionadas}
                onChange={setOrcamentosRegionaisSelecionadas}
                wrapperClassName="filters-bar__field filters-bar__field--full"
              />
            </section>
            {orcamentosError && <div className="error-banner">Erro ao carregar dados: {orcamentosError}</div>}
            {!orcamentosLoading && (
              <SituacaoCards
                rows={orcamentos}
                situacaoAtiva={orcamentosSituacaoAtiva}
                onSituacaoClick={handleOrcamentosSituacaoClick}
              />
            )}
            <MedidasTable rows={orcamentosFiltrados} loading={orcamentosLoading} />
          </>
        )}
      </main>
    </>
  );
}
