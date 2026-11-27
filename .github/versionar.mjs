// Roda na publicação (publicar.yml), depois de separar os arquivos do site em _site.
// O GitHub Pages deixa cada arquivo guardado no navegador por 10 minutos. Sem versão no endereço, uma página aberta
// logo depois de uma publicação pode juntar um arquivo antigo com outro novo, e a tela não abre. Aqui cada .js e .css
// ganha "?v=<commit>" no endereço: o app.js e os .css direto no index.html, e os módulos pelo import map (que troca
// o endereço de cada import relativo). O código do repositório não muda e continua funcionando sem isso em localhost.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const pasta = process.argv[2] ?? '_site'
const versao = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 10)

const modulos = []
function listar(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, item.name)
    if (item.isDirectory()) listar(caminho)
    else if (item.name.endsWith('.js')) modulos.push(relative(pasta, caminho).replaceAll('\\', '/'))
  }
}
listar(join(pasta, 'js'))
modulos.sort()

const arquivo = join(pasta, 'index.html')
let html = readFileSync(arquivo, 'utf8')

// Troca um trecho que precisa existir; se não achar, a publicação para (melhor que publicar sem versão).
function trocar(antes, depois) {
  if (!html.includes(antes)) throw new Error(`versionar.mjs: não achei ${antes} no index.html`)
  html = html.replace(antes, depois)
}

const marcaDoMapa = /<script type="importmap">([\s\S]*?)<\/script>/
const achado = html.match(marcaDoMapa)
if (!achado) throw new Error('versionar.mjs: não achei o import map no index.html')
const mapa = JSON.parse(achado[1])
for (const modulo of modulos) mapa.imports[`./${modulo}`] = `./${modulo}?v=${versao}`
const recuo = '        '
const json = JSON.stringify(mapa, null, 2).split('\n').join(`\n${recuo}`)
html = html.replace(marcaDoMapa, `<script type="importmap">\n${recuo}${json}\n    </script>`)

trocar('src="js/app.js"', `src="js/app.js?v=${versao}"`)
trocar('href="css/estilos.css"', `href="css/estilos.css?v=${versao}"`)
trocar('href="fontes/fontes.css"', `href="fontes/fontes.css?v=${versao}"`)

writeFileSync(arquivo, html)
console.log(`Versão ${versao}: ${modulos.length} módulos com ?v= no import map.`)
