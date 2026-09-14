import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import MetricCards from './components/MetricCards.jsx';
import Filters from './components/Filters.jsx';
import Tabs from './components/Tabs.jsx';
import MedidasTable from './components/MedidasTable.jsx';
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

const SERVICOS_HISTORICO = [
  'COMT', 'COBT', 'PSAA', 'PSER', 'PSAC', 'PSRP', 'PSAG', 'PSAI', 'PSAF', 'PSSG', 'PSIP', 'PSST',
];
const MERCADOS_HISTORICO = ['URBANO', 'RURAL'];

export default function App() {
  const [rows, setRows] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [resumoGrupo2, setResumoGrupo2] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ areas: [], statusList: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [areaFiltro, setAreaFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [medidasGrupo1, setMedidasGrupo1] = useState([]);
  const [medidasGrupo2, setMedidasGrupo2] = useState([]);
  const [medidasSelecionadas, setMedidasSelecionadas] = useState([]);
  const [medidasInicializado, setMedidasInicializado] = useState(false);
  const [statusPendenteConfig, setStatusPendenteConfig] = useState([]);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('lista');
  // Atalho de filtro disparado pelos cards de métrica: null (Total pendentes) | 'atraso' | 'grupo2'
  const [cardFiltroAtivo, setCardFiltroAtivo] = useState(null);

  // Aba "Inconsistências": regra de negócio independente, sem relação com os
  // filtros de área/status/medida/card acima — busca uma vez só, filtro local.
  const [inconsistencias, setInconsistencias] = useState([]);
  const [inconsistenciasLoading, setInconsistenciasLoading] = useState(true);
  const [inconsistenciasError, setInconsistenciasError] = useState(null);
  const [tiposInconsistencia, setTiposInconsistencia] = useState([]);
  const [tiposSelecionados, setTiposSelecionados] = useState([]);

  // Aba "Histórico": gráficos de aprovação/liberação são independentes dos
  // filtros acima — busca uma vez só, sem relação com área/status/medida/card.
  // servico/mercado são filtros próprios da aba, compartilhados pelos 3 gráficos.
  const [historicoAprovacao, setHistoricoAprovacao] = useState([]);
  const [historicoLiberacao, setHistoricoLiberacao] = useState([]);
  const [historicoUniversalizacao, setHistoricoUniversalizacao] = useState([]);
  const [historicoLoading, setHistoricoLoading] = useState(true);
  const [historicoError, setHistoricoError] = useState(null);
  // ChipMultiFilter trabalha com array de selecionadas. Serviço começa só com
  // COMT (preserva o comportamento/carga de antes); "Todos" soma os 12
  // códigos disponíveis (servico vira lista pro backend, sem default implícito).
  const [historicoServicoSelecionado, setHistoricoServicoSelecionado] = useState(  SERVICOS_HISTORICO.filter((s) => s !== 'PSAA' && s !== 'PSAI'),);
  const historicoServico = historicoServicoSelecionado.join(',');
  // As duas opções de mercado marcadas (padrão) equivalem a "Todos" = sem
  // filtro de mercado no backend.
  const [historicoMercadoSelecionado, setHistoricoMercadoSelecionado] = useState(MERCADOS_HISTORICO);
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

  function limparFiltros() {
    setAreaFiltro('');
    setStatusFiltro('');
    setMedidasSelecionadas(medidasGrupo1);
    setCardFiltroAtivo(null);
  }

  function handleCardClick(filterKey) {
    if (filterKey === 'total') {
      limparFiltros();
      return;
    }
    setCardFiltroAtivo((atual) => (atual === filterKey ? null : filterKey));
  }

  async function carregarDados() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (areaFiltro) params.set('area', areaFiltro);
      if (statusFiltro) params.set('status', statusFiltro);
      // Só manda "medidas" quando o usuário desmarcou alguma opção — com tudo
      // marcado o comportamento é o mesmo de não filtrar (usa o grupo 1 padrão do backend).
      if (medidasInicializado && medidasSelecionadas.length !== medidasGrupo1.length) {
        params.set('medidas', medidasSelecionadas.join(','));
      }
      // Atalhos dos cards de métrica — combinam com os filtros acima (AND no backend).
      if (cardFiltroAtivo === 'atraso') params.set('situacao', 'EM ATRASO');
      if (cardFiltroAtivo === 'grupo2') params.set('grupo2', 'SIM');
      const qs = params.toString();

      // O resumo do grupo 2 só reaproveita área/status (medidas do grupo 1 e os
      // atalhos de card não fazem sentido nele — os códigos já são fixos e a
      // ideia é agregar as medidas do grupo 2 em si, não notas do grupo 1).
      const paramsGrupo2 = new URLSearchParams();
      if (areaFiltro) paramsGrupo2.set('area', areaFiltro);
      if (statusFiltro) paramsGrupo2.set('status', statusFiltro);
      const qsGrupo2 = paramsGrupo2.toString();

      const [respMedidas, respResumo, respResumoGrupo2] = await Promise.all([
        fetch(`/api/medidas?${qs}`),
        fetch(`/api/medidas/resumo?${qs}`),
        fetch(`/api/medidas/resumo-grupo2?${qsGrupo2}`),
      ]);
      if (!respMedidas.ok) throw new Error(`Falha na API (${respMedidas.status})`);
      if (!respResumo.ok) throw new Error(`Falha na API do resumo (${respResumo.status})`);
      if (!respResumoGrupo2.ok) throw new Error(`Falha na API do resumo grupo 2 (${respResumoGrupo2.status})`);

      const json = await respMedidas.json();
      const jsonResumo = await respResumo.json();
      const jsonResumoGrupo2 = await respResumoGrupo2.json();
      setRows(json.data);
      setResumo(jsonResumo.data);
      setResumoGrupo2(jsonResumoGrupo2.data);

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
      if (json.regrasNegocio?.statusPendente?.length) {
        setStatusPendenteConfig(json.regrasNegocio.statusPendente);
      }

      // Só repopula as opções dos dropdowns a partir do carregamento sem filtro
      // nenhum — senão, ao selecionar uma área, o próprio dropdown encolheria
      // para mostrar só as opções presentes no resultado já filtrado.
      if (!areaFiltro && !statusFiltro) {
        setFilterOptions({
          areas: [...new Set(json.data.map((r) => r.COD_AREA_RESP).filter(Boolean))].sort(),
          statusList: [...new Set(json.data.map((r) => r.COD_STAT_USU).filter(Boolean))].sort(),
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaFiltro, statusFiltro, medidasSelecionadas, cardFiltroAtivo]);

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
      } catch (err) {
        setHistoricoError(err.message);
      } finally {
        setHistoricoLoading(false);
      }
    }
    carregarHistorico();
  }, [historicoServico, historicoMercado]);

  useEffect(() => {
    async function carregarProdutividade() {
      setProdutividadeLoading(true);
      setProdutividadeError(null);
      try {
        const params = new URLSearchParams();
        params.set('servico', historicoServico);
        if (historicoMercado) params.set('mercado', historicoMercado);
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
  }, [produtividadeMedidasSelecionadas, historicoServico, historicoMercado]);

  const metrics = useMemo(() => {
    const totalPendentes = rows.length;
    const emAtraso = rows.filter((r) => (r.DES_SITUACAO || '').toUpperCase().includes('ATRASO')).length;
    const areasEnvolvidas = new Set(
      rows.filter((r) => r.TEM_PENDENCIA_GRUPO2 === 'SIM').map((r) => r.NUM_NOTA),
    ).size;
    return { totalPendentes, emAtraso, areasEnvolvidas };
  }, [rows]);

  const inconsistenciasFiltradas = useMemo(
    () => inconsistencias.filter((r) => tiposSelecionados.includes(r.TIPO_INCONSISTENCIA)),
    [inconsistencias, tiposSelecionados],
  );

  return (
    <>
      <Header ultimaAtualizacao={ultimaAtualizacao} />
      <main className="app-main">
        {(abaAtiva === 'lista' || abaAtiva === 'graficos') && (
          <>
            <MetricCards
              metrics={metrics}
              loading={loading}
              cardFiltroAtivo={cardFiltroAtivo}
              onCardClick={handleCardClick}
            />
            <Filters
              areas={filterOptions.areas}
              statusList={filterOptions.statusList}
              areaSelecionada={areaFiltro}
              statusSelecionado={statusFiltro}
              onAreaChange={setAreaFiltro}
              onStatusChange={setStatusFiltro}
              medidasGrupo1={medidasGrupo1}
              medidasSelecionadas={medidasSelecionadas}
              onMedidasChange={setMedidasSelecionadas}
              cardFiltroAtivo={cardFiltroAtivo}
              onLimpar={limparFiltros}
            />
            {error && <div className="error-banner">Erro ao carregar dados: {error}</div>}
          </>
        )}

        <Tabs abaAtiva={abaAtiva} onChange={setAbaAtiva} />

        {abaAtiva === 'lista' && <MedidasTable rows={rows} loading={loading} />}

        {abaAtiva === 'graficos' && (
          <>
            <MedidasBarChart
              titulo="Medidas pendentes por código e status"
              resumo={resumo}
              codigos={medidasSelecionadas.length ? medidasSelecionadas : medidasGrupo1}
              statusList={statusPendenteConfig}
              loading={loading}
            />
            <MedidasBarChart
              titulo="Medidas pendentes — Áreas envolvidas"
              resumo={resumoGrupo2}
              codigos={medidasGrupo2}
              statusList={statusPendenteConfig}
              loading={loading}
            />
          </>
        )}

        {abaAtiva === 'inconsistencias' && (
          <>
            <section className="filters-bar">
              <ChipMultiFilter
                label="Tipo de inconsistência — clique isola, Ctrl/Cmd+clique combina"
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
                label="Serviço — clique isola, Ctrl/Cmd+clique combina"
                opcoes={SERVICOS_HISTORICO}
                selecionadas={historicoServicoSelecionado}
                onChange={setHistoricoServicoSelecionado}
                wrapperClassName="filters-bar__field filters-bar__field--full"
              />
              <ChipMultiFilter
                label="Mercado"
                opcoes={MERCADOS_HISTORICO}
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
                label="Produtividade — filtrar por medida — clique isola, Ctrl/Cmd+clique combina"
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
      </main>
    </>
  );
}
