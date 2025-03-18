<h3 align="center">AutoDroid Watcher Server</h3>

## 📝 Índice <a name="summary"></a>

- [📖 Sobre](#about)
- [🏁 Primeiros Passos](#getting_started)
- [📱 Utilização](#usage)
- [⛏️ Tecnologias Utilizadas](#built_using)
- [🤝🏻 Contribuições](docs/CONTRIBUTING.md)
- [💾 Changelog](CHANGELOG.md)

## 📖 Sobre <a name = "about"></a>

Este repositório contém o código-fonte do servidor do AutoDroid Watcher, um projeto desenvolvido para receber dados de telemetria e conduzir experimentos do software [AutoDroid](https://github.com/MalwareDataLab/autodroid-api) da [Malware DataLab](https://malwaredatalab.github.io/).

Este servidor recebe a conexão de um ou mais [clientes](https://github.com/MalwareDataLab/autodroid-watcher-client) que devem ser instalados nas máquinas onde o [AutoDroid Worker](https://github.com/MalwareDataLab/autodroid-worker) está instalado. O cliente é responsável por coletar os dados de telemetria e enviá-los para o servidor, além de iniciar os experimentos e a coleta de dados.

Os resultados dos experimentos são armazenados em arquivos CSV e gráficos, que podem ser utilizados para análise e visualização dos dados coletados, uma amostra de uma iteração completa está disponível na [pasta `examples`](
  https://github.com/MalwareDataLab/autodroid-watcher-server/tree/main/docs/examples) deste repositório.

## 🏁 Primeiros Passos <a name = "getting_started"></a>

Estas instruções irão ajudá-lo a obter uma cópia deste projeto e executá-lo em sua máquina local para fins de desenvolvimento e teste.

Clone este repositório em sua máquina local:

```bash
git clone https://github.com/MalwareDataLab/autodroid-watcher-server.git
```

Entre no diretório do projeto:

```bash
cd autodroid-watcher-server
```

Este software foi desenvolvido para ser executado em um ambiente Linux.


### Pré-requisitos

Para executar o projeto, você precisará ter o Node.js e o npm instalados em sua máquina. Você pode baixar o Node.js [aqui](https://nodejs.org/) ou através do comando abaixo:

```bash
# Gerenciador de versões do Node.js:
curl -o- https://fnm.vercel.app/install | bash

# Baixar e instalar o Node.js:
fnm install 22.14.0

# Definir a versão do Node.js:
fnm use 22.14.0

```

Adicionalmente, instale os pacotes necessários para gerar os gráficos:

```bash
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

### Instalação

Após clonar o repositório, entre no diretório do projeto e instale as dependências:

```bash
npm install
```

### Túneis HTTP

Esta aplicação requer um túnel HTTP para receber os dados dos clientes. Você pode usar o [ngrok](https://ngrok.com/) ou o [cloudflared](https://developers.cloudflare.com/pages/how-to/preview-with-cloudflare-tunnel/).

Por padrão, o servidor escuta na porta HTTP 3000, você pode alterar este comportamento no parâmetro `--port <PORT>`.

### Clientes

Siga as instruções para configurar o(s)  [cliente(s)](https://github.com/MalwareDataLab/) na máquina onde o [AutoDroid Worker](https://github.com/MalwareDataLab/autodroid-worker) está instalado.


- [📱 Utilização](#usage)

Certifique-se de que o túnel HTTP esteja operacional e o(s) [cliente(s)](https://github.com/MalwareDataLab/autodroid-watcher-client) estejam configurados para enviar os dados para a URL que foi gerada ao executar o túnel.

### Executando o Servidor

Para executar o servidor, utilize o comando abaixo:

```bash
npm run dev -t "secure_token" -q 10 -p 3000 -e prod --email john@doe -i 1
```

Os parâmetros são:
- `-t` ou `--token`: Token de autenticação do cliente. Este token deve ser o mesmo que foi configurado nos clientes. É um mecanismo de segurança para garantir que apenas clientes autorizados possam se conectar ao servidor. O valor é definido pelo utilizador.
- `-q` ou `--quantity`: Número de clientes conectados a esperar antes de iniciar uma iteração.
- `-p` ou `--port`: Porta do servidor. O padrão é 3000.
- `-e` ou `--env`: Ambiente do servidor, sendo `prod` ou `dev`. Caso esteja utilizando sua conta do [Malware DataLab](https://malwaredatalab.github.io/), utilize o ambiente `prod`. Caso contrário, utilize o ambiente `dev`.
- `-i` ou `--iterations`: Número de iterações a serem realizadas. Uma iteração completa solicita 10, 20, 30 em sequência. O padrão é 1.
- `--email`: Email da conta registrada no [Malware DataLab](https://malwaredatalab.github.io/) ou no projeto Firebase configurado na instância da [AutoDroid API](https://github.com/MalwareDataLab/autodroid-api).
- `--firebase-api-token`: Token da API do Firebase caso tenha sido utilizado um projeto Firebase diferente do padrão. O padrão é o projeto do [Malware DataLab](https://malwaredatalab.github.io/).
- `--help`: Exibe a ajuda do comando.

### Resultados

Os resultados são armazenados na pasta `experiments` e são organizados por data e hora. Cada iteração é armazenada em um arquivo separado.

Os resultados dos experimentos são armazenados em arquivos CSV e gráficos, que podem ser utilizados para análise e visualização dos dados coletados, uma amostra de uma iteração completa está disponível na [pasta `examples`](
  https://github.com/MalwareDataLab/autodroid-watcher-server/tree/main/docs/examples) deste repositório.

### Estatísticas

Utilize o comando abaixo para gerar as estatísticas dos experimentos:

```bash
npm run statistics
```

Este comando irá gerar todas as estatísticas, por cada experimento (entre os nós do experimento) e globalmente caso mais de uma iteração tenha sido realizada, na pasta `globalStatistics`.

### Gráficos Preliminares

Utilize o comando abaixo para gerar os gráficos preliminares dos experimentos:

```bash
npm run chart:experiments
npm run chart:statistics
```

Os gráficos serão gerados nas pastas de cada experimento e na pasta `globalStatistics`, respectivamente.

## ⛏️ Tecnologias Utilizadas <a name = "built_using"></a>

- [TypeScript](https://www.typescriptlang.org/) - Linguagem de programação
- [Node.js](https://nodejs.org/) - Ambiente de execução
- [Axios](https://axios-http.com/) - Cliente HTTP
- [Chart.js](https://www.chartjs.org/) - Biblioteca de gráficos
- [Socket.io](https://socket.io/) - Biblioteca para comunicação em tempo real
- [simple-statistics](https://simplestatistics.org/) - Biblioteca de estatísticas

### Geral

É importante mencionar as demais ferramentas que serão utilizadas nas duas partes do projeto:

- [Git](https://git-scm.com/) - Controle de versão
- [Husky](https://typicode.github.io/husky/#/) - Hooks do Git
- [Lint Staged](https://github.com/okonet/lint-staged) - Ferramenta para verificar arquivos commitados
- [Commitizen](https://github.com/commitizen/cz-cli) - Auxiliar para mensagens de commit do Git
- [Commitlint](https://commitlint.js.org/) - Verificador de mensagens de commit do Git
- [Standard Version](https://github.com/conventional-changelog/standard-version) - Gerador de changelog
- [Eslint](https://eslint.org/) - Framework de verificação de código
- [Prettier](https://prettier.io/) - Formatador de código
- [Semver](https://semver.org/) - Versionamento semântico
