# Sistema de Lista de Compras com Microsserviços

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/NoSQL-Database-green?style=for-the-badge" alt="NoSQL" />
  <img src="https://img.shields.io/badge/Microservices-Architecture-blue?style=for-the-badge" alt="Microservices" />
</div>

## Sobre o Projeto

Sistema distribuído para gerenciamento de listas de compras desenvolvido com **arquitetura de microsserviços**. O projeto implementa um sistema completo com API Gateway, Service Discovery e bancos NoSQL independentes para demonstrar os conceitos de sistemas distribuídos modernos.

### Contexto Acadêmico

**Instituição:** Pontifícia Universidade Católica de Minas Gerais (PUC Minas)  

**Instituto:** Instituto de Ciências Exatas e Informática (ICEI)  

**Disciplina:** Laboratório de Desenvolvimento de Aplicações Móveis e Distribuídas  

**Professor:** Cleiton Tavares

**Desenvolvedora:** Milena Lara Reis Ferreira  

**Apresentação em vídeo:** https://drive.google.com/file/d/1_yuewKlJ5h_MaEHDn1cL6oh7XfGfhhP9/view?usp=sharing

---

## Arquitetura do Sistema

### Microsserviços Implementados

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Service  │    │   Item Service  │    │   List Service  │
│    (Porta 3001) │    │    (Porta 3003) │    │    (Porta 3002) │
│                 │    │                 │    │                 │
│ • Autenticação  │    │ • Catálogo      │    │ • Listas        │
│ • Usuários      │    │ • Categorias    │    │ • Itens da Lista│
│ • JWT Tokens    │    │ • Busca         │    │ • Resumos       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │    (Porta 3000) │
                    │                 │
                    │ • Roteamento    │
                    │ • Circuit Breaker│
                    │ • Health Checks │
                    │ • Dashboard     │
                    └─────────────────┘
```

### Componentes Compartilhados

- **Service Registry:** Descoberta de serviços baseada em arquivo
- **JsonDatabase:** Banco NoSQL baseado em arquivos JSON
- **API Gateway:** Ponto único de entrada com balanceamento e monitoramento

---

## Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web minimalista
- **JWT** - Autenticação baseada em tokens
- **bcryptjs** - Hash de senhas
- **uuid** - Geração de identificadores únicos

### Banco de Dados
- **NoSQL JSON** - Bancos independentes por serviço
- **Database per Service** - Padrão de microserviços

### Ferramentas
- **axios** - Cliente HTTP para comunicação entre serviços
- **concurrently** - Execução paralela de serviços
- **helmet** - Segurança para Express
- **cors** - Cross-Origin Resource Sharing
- **morgan** - Logging de requisições

---

## Instalação e Execução

### Pré-requisitos

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0

### 1. Clonagem do Repositório

```bash
git clone https://github.com/milenalara/lab03-microservices-nosql.git
cd lab03-microservices-nosql
```

### 2. Instalação de Dependências

```bash
# Instalar dependências de todos os serviços
npm run install:all
```

### 3. Execução do Sistema

#### Opção A: Iniciar todos os serviços simultaneamente
```bash
npm start
```

#### Opção B: Iniciar serviços individualmente
```bash
# Terminal 1 - User Service
npm run start:user

# Terminal 2 - Item Service  
npm run start:item

# Terminal 3 - List Service
npm run start:list

# Terminal 4 - API Gateway
npm run start:gateway
```

### 4. Executar Demonstração

```bash
# Executar cliente de demonstração
npm run demo
```

---

## Documentação da API

### URLs dos Serviços

| Serviço | URL | Documentação |
|---------|-----|--------------|
| API Gateway | http://localhost:3000 | `/` |
| User Service | http://localhost:3001 | `/info` |
| Item Service | http://localhost:3003 | `/info` |
| List Service | http://localhost:3002 | `/info` |

### Autenticação

O sistema utiliza **JWT (JSON Web Tokens)** para autenticação. Para acessar endpoints protegidos:

```bash
# 1. Registrar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456","firstName":"João","lastName":"Silva"}'

# 2. Fazer login e obter token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"123456"}'

# 3. Usar token em requisições protegidas
curl -H "Authorization: Bearer SEU_TOKEN_JWT" \
  http://localhost:3000/api/lists
```

### Principais Endpoints

#### Autenticação (User Service)
```bash
POST /api/auth/register    # Cadastro de usuário
POST /api/auth/login       # Login
GET  /api/users/:id        # Buscar usuário
PUT  /api/users/:id        # Atualizar perfil
```

#### Catálogo (Item Service)
```bash
GET  /api/items            # Listar itens
GET  /api/items/:id        # Buscar item específico
POST /api/items            # Criar item (autenticado)
GET  /api/categories       # Listar categorias
GET  /api/search/items?q=  # Buscar itens
```

#### Listas de Compras (List Service)
```bash
GET    /api/lists                    # Listar listas do usuário
POST   /api/lists                    # Criar nova lista
GET    /api/lists/:id                # Buscar lista específica
PUT    /api/lists/:id                # Atualizar lista
DELETE /api/lists/:id                # Deletar lista
POST   /api/lists/:id/items          # Adicionar item à lista
PUT    /api/lists/:id/items/:itemId  # Atualizar item na lista
DELETE /api/lists/:id/items/:itemId  # Remover item da lista
GET    /api/lists/:id/summary        # Resumo da lista
```

#### Agregados (API Gateway)
```bash
GET /api/dashboard         # Dashboard do usuário
GET /api/search?q=         # Busca global
GET /health                # Status dos serviços
GET /registry              # Serviços registrados
```

---

## Testando o Sistema

### Health Check
```bash
# Verificar status de todos os serviços
curl http://localhost:3000/health
```

### Fluxo Completo de Teste
```bash
# 1. Verificar saúde dos serviços
curl http://localhost:3000/health

# 2. Registrar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"123456","firstName":"Test","lastName":"User"}'

# 3. Fazer login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"123456"}'

# 4. Buscar itens (substitua TOKEN pelo JWT recebido)
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/items

# 5. Criar lista
curl -X POST http://localhost:3000/api/lists \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Minha Lista","description":"Lista de teste"}'

# 6. Ver dashboard
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/dashboard
```

---

## Funcionalidades Implementadas

### User Service
- [x] Cadastro de usuários com validação
- [x] Sistema de login com JWT
- [x] Hash de senhas com bcrypt
- [x] Validação de email único
- [x] Middleware de autenticação
- [x] Gerenciamento de perfil

### Item Service  
- [x] Catálogo de produtos com 25+ itens
- [x] 5 categorias: Alimentos, Limpeza, Higiene, Bebidas, Padaria
- [x] Busca por categoria e nome
- [x] Endpoints protegidos para criação/edição
- [x] Sistema de busca textual

### List Service
- [x] CRUD completo de listas de compras
- [x] Adição/remoção de itens nas listas
- [x] Integração com Item Service via Service Registry
- [x] Cálculo automático de totais estimados
- [x] Controle de status (ativo, completo, arquivado)
- [x] Resumos e estatísticas

### API Gateway
- [x] Roteamento inteligente para microsserviços
- [x] Circuit Breaker (3 falhas = circuito aberto)
- [x] Health checks automáticos (30 segundos)
- [x] Dashboard agregado
- [x] Busca global (listas + itens)
- [x] Logs detalhados de requisições

### Service Registry
- [x] Descoberta de serviços baseada em arquivo
- [x] Registro automático na inicialização
- [x] Health checks distribuídos
- [x] Cleanup automático na saída dos processos

---

## Arquitetura e Padrões

### Padrões de Microserviços Implementados

#### Service Discovery
- Registry baseado em arquivo compartilhado
- Descoberta automática de serviços
- Health checks distribuídos

#### API Gateway Pattern
- Ponto único de entrada
- Roteamento baseado em path
- Agregação de dados de múltiplos serviços

#### Circuit Breaker
- Proteção contra falhas em cascata
- Abertura automática após 3 falhas
- Recovery automático após timeout

#### Database per Service
- Banco NoSQL independente por serviço
- Isolamento de dados
- Esquemas específicos por domínio

#### Distributed Authentication
- JWT tokens para comunicação stateless
- Validação distribuída entre serviços
- Middleware de autenticação reutilizável

### Estrutura do Projeto

```
lab03-microservices-nosql/
├── package.json              # Scripts de build e execução
├── README.md                 # Documentação do projeto
├── client-demo.js            # Cliente de demonstração
├── shared/                   # Componentes compartilhados
│   ├── JsonDatabase.js       # Banco NoSQL baseado em JSON
│   └── serviceRegistry.js    # Service Discovery
├── api-gateway/              # Gateway de entrada
│   ├── package.json
│   └── server.js
└── services/                 # Microsserviços
    ├── user-service/         # Serviço de usuários
    │   ├── package.json
    │   ├── server.js
    │   └── models/
    │       └── UserModel.js
    ├── item-service/         # Serviço de itens
    │   ├── package.json
    │   ├── server.js
    │   └── models/
    │       └── ItemModel.js
    └── list-service/         # Serviço de listas
        ├── package.json
        ├── server.js
        └── models/
            └── ListModel.js
```

---

## Cliente de Demonstração

O projeto inclui um **cliente de demonstração completo** (`client-demo.js`) que testa todos os cenários:

### Fluxo de Demonstração

1. **Health Check** - Verifica status de todos os serviços
2. **Registro de Usuário** - Cadastra novo usuário no sistema
3. **Login** - Autentica e obtém token JWT
4. **Busca de Itens** - Explora o catálogo de produtos
5. **Criação de Lista** - Cria nova lista de compras
6. **Adição de Itens** - Adiciona itens à lista criada
7. **Dashboard** - Visualiza dashboard agregado
8. **Busca Global** - Testa busca em múltiplos serviços

### Executar Demonstração
```bash
npm run demo
```

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm start` | Inicia todos os serviços simultaneamente |
| `npm run start:user` | Inicia apenas o User Service |
| `npm run start:item` | Inicia apenas o Item Service |
| `npm run start:list` | Inicia apenas o List Service |
| `npm run start:gateway` | Inicia apenas o API Gateway |
| `npm run demo` | Executa cliente de demonstração |
| `npm run health` | Verifica saúde de todos os serviços |
| `npm run install:all` | Instala dependências de todos os serviços |
| `npm run clean` | Remove node_modules de todos os serviços |

---

## Troubleshooting

### Problemas Comuns

#### **Erro de Conexão Recusada**
```bash
# Verificar se todos os serviços estão rodando
npm run health

# Verificar portas ocupadas
lsof -i :3000  # API Gateway
lsof -i :3001  # User Service
lsof -i :3002  # List Service
lsof -i :3003  # Item Service
```

#### **Service Registry não encontra serviços**
```bash
# Verificar arquivo de registry
cat shared/services-registry.json

# Limpar registry e reiniciar
rm shared/services-registry.json
npm start
```

#### **Erro de autenticação JWT**
- Verificar se o token está sendo enviado no header `Authorization: Bearer TOKEN`
- Verificar se o User Service está rodando
- Verificar se o token não expirou

#### **Erro na inicialização**
```bash
# Reinstalar dependências
npm run clean
npm run install:all

# Verificar versões do Node.js
node --version  # >= 16.0.0
npm --version   # >= 8.0.0
```

### Logs de Debug

Cada serviço produz logs detalhados. Para debug:

```bash
# Verificar logs do API Gateway
tail -f api-gateway/logs/gateway.log

# Verificar Service Registry
cat shared/services-registry.json
```

---

## Monitoramento e Observabilidade

### Health Checks

O sistema implementa health checks em múltiplas camadas:

```bash
# Health check geral do sistema
curl http://localhost:3000/health

# Health check de serviço específico
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # List Service  
curl http://localhost:3003/health  # Item Service
```

### Registry de Serviços

```bash
# Ver serviços registrados
curl http://localhost:3000/registry

# Resposta exemplo:
{
  "success": true,
  "services": {
    "user-service": {
      "url": "http://localhost:3001",
      "healthy": true,
      "registeredAt": "2025-09-22T00:00:00.000Z",
      "uptime": 12345,
      "pid": 1234
    }
  },
  "count": 3
}
```

### Circuit Breaker Status

O API Gateway monitora a saúde dos serviços e implementa circuit breaker:

- **Fechado (Closed):** Funcionamento normal
- **Aberto (Open):** Serviço indisponível (após 3 falhas)
- **Meio-aberto (Half-Open):** Testando recuperação

---

## Características Técnicas Avançadas

### **Segurança**
- Hash de senhas com bcrypt (salt rounds: 12)
- Validação de entrada em todos os endpoints
- Headers de segurança com Helmet
- CORS configurado adequadamente
- Tokens JWT com expiração

### **Performance**
- Circuit breaker para resiliência
- Timeouts configurados (5-10 segundos)
- Logs estruturados para debugging
- Health checks otimizados

### **Escalabilidade**
- Arquitetura stateless
- Database per service
- Service discovery dinâmico
- Load balancing preparado

### **Manutenibilidade**
- Código modular e bem documentado
- Padrões consistentes entre serviços
- Tratamento centralizado de erros
- Logs padronizados

---

## 📝 Exemplos de Uso

### Cenário Completo: Criando uma Lista de Compras

```javascript
// 1. Registrar usuário
const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'maria@exemplo.com',
    password: 'minhasenha123',
    firstName: 'Maria',
    lastName: 'Silva'
  })
});

// 2. Fazer login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'maria@exemplo.com',
    password: 'minhasenha123'
  })
});
const { token } = await loginResponse.json();

// 3. Buscar itens disponíveis
const itemsResponse = await fetch('http://localhost:3000/api/items', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const items = await itemsResponse.json();

// 4. Criar lista de compras
const listResponse = await fetch('http://localhost:3000/api/lists', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Compras da Semana',
    description: 'Lista para compras semanais'
  })
});
const { list } = await listResponse.json();

// 5. Adicionar item à lista
const addItemResponse = await fetch(`http://localhost:3000/api/lists/${list.id}/items`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    itemId: items.items[0].id,
    quantity: 2,
    estimatedPrice: items.items[0].averagePrice,
    notes: 'Comprar na promoção'
  })
});

// 6. Ver resumo da lista
const summaryResponse = await fetch(`http://localhost:3000/api/lists/${list.id}/summary`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const summary = await summaryResponse.json();

console.log('Lista criada com sucesso!', summary);
```

---

## Contribuindo

Este é um projeto acadêmico, mas contribuições são bem-vindas!

### Como Contribuir

1. **Fork** o projeto
2. **Clone** seu fork
3. **Crie** uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
4. **Commit** suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
5. **Push** para a branch (`git push origin feature/nova-funcionalidade`)
6. **Abra** um Pull Request

### Padrões de Código

- Use **ESLint** para formatação
- Mantenha **cobertura de logs** adequada
- **Documente** funções complexas
- **Teste** antes de enviar PR

---

## Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## Autor

**Milena Lara Reis Ferreira**  
Estudante de Ciências da Computação - PUC Minas  
Email: milena.ferreira@sga.pucminas.br  
GitHub: [@milenalara](https://github.com/milenalara)

---

## Agradecimentos

- **PUC Minas** e **ICEI** pela excelente formação
- **Professores Artur Mol, Cleiton Tavares e Cristiano Neto** pela orientação
- **Comunidade Node.js** pelas ferramentas incríveis
- **Arquitetura de Microsserviços** por possibilitar sistemas distribuídos elegantes

---

<div align="center">
  <p><strong>Desenvolvido com dedicação para aprendizado de Sistemas Distribuídos</strong></p>
  <p><em>PUC Minas - Instituto de Ciências Exatas e Informática</em></p>
</div>
