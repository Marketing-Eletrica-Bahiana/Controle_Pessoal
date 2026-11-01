// Gráficos leves com Chart.js (carregado do CDN só no Dashboard), só com as cores da paleta.
import { erroDoApp } from '../lib/erros.js'
import { el } from './dom.js'

let chart = null
async function carregarChart() {
  if (!chart) {
    try {
      const modulo = await import('chart.js')
      chart = modulo.default ?? modulo.Chart
      chart.defaults.font.family = "'EB Lato', 'Lato', sans-serif"
      chart.defaults.font.size = 13
      // Textos em preto e linhas em marinho transparente: nada do cinza padrão do Chart.js.
      chart.defaults.color = '#000000'
      chart.defaults.borderColor = 'rgba(0, 23, 128, 0.1)'
    } catch {
      throw erroDoApp('Não deu para carregar os gráficos. Confira a internet.')
    }
  }
  return chart
}

export const CORES = {
  marinho: '#001780',
  brilhante: '#0037ff',
  medio: '#4069ff',
  medioClaro: 'rgba(64, 105, 255, 0.35)',
  vermelho: '#d4121a',
}

const reduzido = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const cortar = (texto, limite = 26) => (texto.length > limite ? `${texto.slice(0, limite - 1)}…` : texto)

// Devolve { no, destruir }. configuracao: { tipo: 'barras' | 'barrasDeitadas', rotulos, series: [{ nome, valores, cor }], porcentagem }
export function grafico({ titulo, altura = 280, configuracao }) {
  const tela = el('canvas', { role: 'img', 'aria-label': titulo })
  const no = el('figure', { class: 'grafico' }, el('figcaption', {}, titulo), el('div', { class: 'grafico__area', style: { height: `${altura}px` } }, tela))
  let instancia = null
  let destruido = false
  carregarChart()
    .then((Chart) => {
      if (destruido) return
      const deitado = configuracao.tipo === 'barrasDeitadas'
      const eixoDeValor = {
        beginAtZero: true,
        max: configuracao.porcentagem ? 100 : undefined,
        ticks: { precision: 0, callback: (v) => (configuracao.porcentagem ? `${v}%` : v) },
        grid: { color: 'rgba(0, 23, 128, 0.1)' },
      }
      const eixoDeRotulo = {
        ticks: { autoSkip: false, callback: function (v) { return cortar(this.getLabelForValue(v)) } },
        grid: { display: false },
      }
      instancia = new Chart(tela, {
        type: 'bar',
        data: {
          labels: configuracao.rotulos,
          datasets: configuracao.series.map((s) => ({ label: s.nome, data: s.valores, backgroundColor: s.cor, borderRadius: 4, maxBarThickness: 36 })),
        },
        options: {
          indexAxis: deitado ? 'y' : 'x',
          responsive: true,
          maintainAspectRatio: false,
          animation: reduzido() ? false : { duration: 400 },
          plugins: {
            legend: { display: configuracao.series.length > 1, labels: { boxWidth: 14 } },
            tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed[deitado ? 'x' : 'y']}${configuracao.porcentagem ? '%' : ''}` } },
          },
          scales: deitado ? { x: eixoDeValor, y: eixoDeRotulo } : { x: eixoDeRotulo, y: eixoDeValor },
        },
      })
    })
    .catch((e) => no.append(el('p', { class: 'grafico__vazio' }, e.message)))
  return {
    no,
    destruir() {
      destruido = true
      instancia?.destroy()
    },
  }
}
