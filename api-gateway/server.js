const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');

// Importar service registry
const serviceRegistry = require('../shared/serviceRegistry');

class APIGateway {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        
        // Circuit breaker simples
        this.circuitBreakers = new Map();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        setTimeout(() => {
            this.startHealthChecks();
        }, 3000); // Aguardar 3 segundos antes de iniciar health checks
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(morgan('combined'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Gateway headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Gateway', 'shopping-list-api-gateway');
            res.setHeader('X-Gateway-Version', '1.0.0');
            res.setHeader('X-Architecture', 'Microservices-NoSQL');
            res.setHeader('X-Domain', 'Shopping-List-Management');
            next();
        });

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${req.method} ${req.originalUrl} - ${req.ip}`);
            next();
        });
    }

    setupRoutes() {
        // Gateway health check
        this.app.get('/health', (req, res) => {
            const services = serviceRegistry.listServices();
            res.json({
                service: 'api-gateway',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                architecture: 'Microservices with NoSQL',
                services: services,
                serviceCount: Object.keys(services).length
            });
        });

        // Gateway info
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Shopping List API Gateway',
                version: '1.0.0',
                description: 'Gateway para sistema de listas de compras com microsserviços',
                architecture: 'Microservices with NoSQL databases',
                database_approach: 'Database per Service (JSON-NoSQL)',
                domain: 'Sistema Distribuído de Gerenciamento de Listas de Compras',
                endpoints: {
                    auth: '/api/auth/*',
                    users: '/api/users/*',
                    items: '/api/items/*',
                    lists: '/api/lists/*',
                    health: '/health',
                    registry: '/registry',
                    dashboard: '/api/dashboard',
                    search: '/api/search'
                },
                services: serviceRegistry.listServices()
            });
        });

        // Service registry endpoint
        this.app.get('/registry', (req, res) => {
            const services = serviceRegistry.listServices();
            res.json({
                success: true,
                services: services,
                count: Object.keys(services).length,
                timestamp: new Date().toISOString()
            });
        });

        // Debug endpoint para troubleshooting
        this.app.get('/debug/services', (req, res) => {
            serviceRegistry.debugListServices();
            res.json({
                success: true,
                services: serviceRegistry.listServices(),
                stats: serviceRegistry.getStats()
            });
        });

        // Auth routes (User Service)
        this.app.use('/api/auth', (req, res, next) => {
            console.log(`🔗 Roteando para user-service (auth): ${req.method} ${req.originalUrl}`);
            this.proxyRequest('user-service', req, res, next);
        });

        // User Service routes
        this.app.use('/api/users', (req, res, next) => {
            console.log(`🔗 Roteando para user-service: ${req.method} ${req.originalUrl}`);
            this.proxyRequest('user-service', req, res, next);
        });

        // Item Service routes  
        this.app.use('/api/items', (req, res, next) => {
            console.log(`🔗 Roteando para item-service: ${req.method} ${req.originalUrl}`);
            this.proxyRequest('item-service', req, res, next);
        });

        // List Service routes
        this.app.use('/api/lists', (req, res, next) => {
            console.log(`🔗 Roteando para list-service: ${req.method} ${req.originalUrl}`);
            this.proxyRequest('list-service', req, res, next);
        });

        // Categories endpoint (Item Service)
        this.app.use('/api/categories', (req, res, next) => {
            console.log(`🔗 Roteando para item-service (categories): ${req.method} ${req.originalUrl}`);
            this.proxyRequest('item-service', req, res, next);
        });

        // Item search endpoint (Item Service)
        this.app.use('/api/search/items', (req, res, next) => {
            console.log(`🔗 Roteando para item-service (search): ${req.method} ${req.originalUrl}`);
            this.proxyRequest('item-service', req, res, next);
        });

        // Endpoints agregados
        this.app.get('/api/dashboard', this.getDashboard.bind(this));
        this.app.get('/api/search', this.globalSearch.bind(this));
    }
    setupErrorHandling() {
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint não encontrado',
                service: 'api-gateway',
                availableEndpoints: {
                    auth: '/api/auth/*',
                    users: '/api/users/*',
                    items: '/api/items/*',
                    lists: '/api/lists/*',
                    categories: '/api/categories',
                    dashboard: '/api/dashboard',
                    search: '/api/search',
                    health: '/health',
                    registry: '/registry'
                }
            });
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('Gateway Error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do gateway',
                service: 'api-gateway'
            });
        });
    }

    // Proxy request to service
    async proxyRequest(serviceName, req, res, next) {
        try {
            console.log(`🔄 Proxy request: ${req.method} ${req.originalUrl} -> ${serviceName}`);
            
            // Verificar circuit breaker
            if (this.isCircuitOpen(serviceName)) {
                console.log(`⚡ Circuit breaker open for ${serviceName}`);
                return res.status(503).json({
                    success: false,
                    message: `Serviço ${serviceName} temporariamente indisponível`,
                    service: serviceName
                });
            }

            // Descobrir serviço com debug
            let service;
            try {
                service = serviceRegistry.discover(serviceName);
            } catch (error) {
                console.error(`❌ Erro na descoberta do serviço ${serviceName}:`, error.message);
                
                // Debug: listar serviços disponíveis
                const availableServices = serviceRegistry.listServices();
                console.log(`📋 Serviços disponíveis:`, Object.keys(availableServices));
                
                return res.status(503).json({
                    success: false,
                    message: `Serviço ${serviceName} não encontrado`,
                    service: serviceName,
                    availableServices: Object.keys(availableServices)
                });
            }
            
            // Construir URL de destino corrigida
            const originalPath = req.originalUrl;
            let targetPath = '';
            
            // Extrair o path correto baseado no serviço
            if (serviceName === 'user-service') {
                // /api/auth/login -> /auth/login
                // /api/auth/register -> /auth/register
                // /api/users -> /users
                // /api/users/123 -> /users/123
                if (originalPath.startsWith('/api/auth')) {
                    targetPath = originalPath.replace('/api/auth', '/auth');
                } else {
                    targetPath = originalPath.replace('/api/users', '/users');
                }
                
                if (!targetPath.startsWith('/')) {
                    targetPath = '/' + targetPath;
                }
                // Se path vazio para users, usar /users
                if (targetPath === '/' || targetPath === '') {
                    targetPath = '/users';
                }
            } else if (serviceName === 'item-service') {
                // /api/items -> /items
                // /api/items/123 -> /items/123
                // /api/categories -> /categories
                // /api/search/items -> /search
                if (originalPath.startsWith('/api/categories')) {
                    targetPath = originalPath.replace('/api/categories', '/categories');
                } else if (originalPath.startsWith('/api/search/items')) {
                    targetPath = originalPath.replace('/api/search/items', '/search');
                } else {
                    targetPath = originalPath.replace('/api/items', '/items');
                }
                
                if (!targetPath.startsWith('/')) {
                    targetPath = '/' + targetPath;
                }
                // Se path vazio, usar /items
                if (targetPath === '/' || targetPath === '') {
                    targetPath = '/items';
                }
            } else if (serviceName === 'list-service') {
                // /api/lists -> /lists
                // /api/lists/123 -> /lists/123
                targetPath = originalPath.replace('/api/lists', '/lists');
                
                if (!targetPath.startsWith('/')) {
                    targetPath = '/' + targetPath;
                }
                // Se path vazio, usar /lists
                if (targetPath === '/' || targetPath === '') {
                    targetPath = '/lists';
                }
            }
            
            const targetUrl = `${service.url}${targetPath}`;
            
            console.log(`🎯 Target URL: ${targetUrl}`);
            
            // Configurar requisição
            const config = {
                method: req.method,
                url: targetUrl,
                headers: { ...req.headers },
                timeout: 10000,
                family: 4,  // Força IPv4
                validateStatus: function (status) {
                    return status < 500; // Aceitar todos os status < 500
                }
            };

            // Adicionar body para requisições POST/PUT/PATCH
            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                config.data = req.body;
            }

            // Adicionar query parameters
            if (Object.keys(req.query).length > 0) {
                config.params = req.query;
            }

            // Remover headers problemáticos
            delete config.headers.host;
            delete config.headers['content-length'];

            console.log(`📤 Enviando ${req.method} para ${targetUrl}`);

            // Fazer requisição
            const response = await axios(config);
            
            // Resetar circuit breaker em caso de sucesso
            this.resetCircuitBreaker(serviceName);
            
            console.log(`📥 Resposta recebida: ${response.status}`);
            
            // Retornar resposta
            res.status(response.status).json(response.data);

        } catch (error) {
            // Registrar falha
            this.recordFailure(serviceName);
            
            console.error(`❌ Proxy error for ${serviceName}:`, {
                message: error.message,
                code: error.code,
                url: error.config?.url,
                status: error.response?.status
            });
            
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                res.status(503).json({
                    success: false,
                    message: `Serviço ${serviceName} indisponível`,
                    service: serviceName,
                    error: error.code
                });
            } else if (error.response) {
                // Encaminhar resposta de erro do serviço
                console.log(`🔄 Encaminhando erro ${error.response.status} do serviço`);
                res.status(error.response.status).json(error.response.data);
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erro interno do gateway',
                    service: 'api-gateway',
                    error: error.message
                });
            }
        }
    }
    // Circuit Breaker 
    isCircuitOpen(serviceName) {
        const breaker = this.circuitBreakers.get(serviceName);
        if (!breaker) return false;

        const now = Date.now();
        
        // Verificar se o circuito deve ser meio-aberto
        if (breaker.isOpen && (now - breaker.lastFailure) > 30000) { // 30 segundos
            breaker.isOpen = false;
            breaker.isHalfOpen = true;
            console.log(`Circuit breaker half-open for ${serviceName}`);
            return false;
        }

        return breaker.isOpen;
    }

    recordFailure(serviceName) {
        let breaker = this.circuitBreakers.get(serviceName) || {
            failures: 0,
            isOpen: false,
            isHalfOpen: false,
            lastFailure: null
        };

        breaker.failures++;
        breaker.lastFailure = Date.now();

        // Abrir circuito após 3 falhas
        if (breaker.failures >= 3) {
            breaker.isOpen = true;
            breaker.isHalfOpen = false;
            console.log(`Circuit breaker opened for ${serviceName}`);
        }

        this.circuitBreakers.set(serviceName, breaker);
    }

    resetCircuitBreaker(serviceName) {
        const breaker = this.circuitBreakers.get(serviceName);
        if (breaker) {
            breaker.failures = 0;
            breaker.isOpen = false;
            breaker.isHalfOpen = false;
            console.log(`Circuit breaker reset for ${serviceName}`);
        }
    }

    // Dashboard agregado para sistema de listas de compras
    async getDashboard(req, res) {
        try {
            const authHeader = req.header('Authorization');
            
            if (!authHeader) {
                return res.status(401).json({
                    success: false,
                    message: 'Token de autenticação obrigatório para acessar o dashboard'
                });
            }

            // Buscar dados de múltiplos serviços
            const [userResponse, itemsResponse, listsResponse, categoriesResponse] = await Promise.allSettled([
                this.callService('user-service', '/users/profile', 'GET', authHeader, {}),
                this.callService('item-service', '/items', 'GET', null, { limit: 10 }),
                this.callService('list-service', '/lists', 'GET', authHeader, { limit: 5 }),
                this.callService('item-service', '/categories', 'GET', null, {})
            ]);

            const dashboard = {
                timestamp: new Date().toISOString(),
                domain: 'Sistema de Lista de Compras',
                architecture: 'Microservices with NoSQL',
                database_approach: 'Database per Service',
                services_status: serviceRegistry.listServices(),
                user_data: {
                    profile: {
                        available: userResponse.status === 'fulfilled',
                        data: userResponse.status === 'fulfilled' ? userResponse.value.data : null,
                        error: userResponse.status === 'rejected' ? userResponse.reason.message : null
                    }
                },
                shopping_data: {
                    lists: {
                        available: listsResponse.status === 'fulfilled',
                        data: listsResponse.status === 'fulfilled' ? listsResponse.value.data : null,
                        error: listsResponse.status === 'rejected' ? listsResponse.reason.message : null
                    },
                    items: {
                        available: itemsResponse.status === 'fulfilled',
                        data: itemsResponse.status === 'fulfilled' ? itemsResponse.value.data : null,
                        error: itemsResponse.status === 'rejected' ? itemsResponse.reason.message : null
                    },
                    categories: {
                        available: categoriesResponse.status === 'fulfilled',
                        data: categoriesResponse.status === 'fulfilled' ? categoriesResponse.value.data : null,
                        error: categoriesResponse.status === 'rejected' ? categoriesResponse.reason.message : null
                    }
                }
            };

            res.json({
                success: true,
                data: dashboard
            });

        } catch (error) {
            console.error('Erro no dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao agregar dados do dashboard'
            });
        }
    }

    // Busca global entre serviços (listas + itens)
    async globalSearch(req, res) {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetro de busca "q" é obrigatório'
                });
            }

            // Buscar em itens e listas (se autenticado)
            const authHeader = req.header('Authorization');
            const searches = [
                this.callService('item-service', '/search', 'GET', null, { q })
            ];

            // Adicionar busca de listas se autenticado
            if (authHeader) {
                searches.push(
                    this.callService('list-service', '/search', 'GET', authHeader, { q, limit: 10 })
                );
            }

            const [itemResults, listResults] = await Promise.allSettled(searches);

            const results = {
                query: q,
                items: {
                    available: itemResults.status === 'fulfilled',
                    results: itemResults.status === 'fulfilled' ? itemResults.value.data?.results || itemResults.value.data : [],
                    error: itemResults.status === 'rejected' ? itemResults.reason.message : null
                }
            };

            // Adicionar resultados de listas se a busca foi feita
            if (listResults) {
                results.lists = {
                    available: listResults.status === 'fulfilled',
                    results: listResults.status === 'fulfilled' ? listResults.value.data?.results || listResults.value.data : [],
                    error: listResults.status === 'rejected' ? listResults.reason.message : null
                };
            }

            res.json({
                success: true,
                data: results
            });

        } catch (error) {
            console.error('Erro na busca global:', error);
            res.status(500).json({
                success: false,
                message: 'Erro na busca'
            });
        }
    }

    // Helper para chamar serviços
    async callService(serviceName, path, method = 'GET', authHeader = null, params = {}) {
        const service = serviceRegistry.discover(serviceName);
        
        const config = {
            method,
            url: `${service.url}${path}`,
            timeout: 5000
        };

        if (authHeader) {
            config.headers = { Authorization: authHeader };
        }

        if (method === 'GET' && Object.keys(params).length > 0) {
            config.params = params;
        }

        const response = await axios(config);
        return response.data;
    }

    // Health checks para serviços registrados
    startHealthChecks() {
        setInterval(async () => {
            await serviceRegistry.performHealthChecks();
        }, 30000); // A cada 30 segundos

        // Health check inicial
        setTimeout(async () => {
            await serviceRegistry.performHealthChecks();
        }, 5000);
    }

    start() {
        this.app.listen(this.port, () => {
            console.log('=====================================');
            console.log(`🛒 Shopping List API Gateway iniciado na porta ${this.port}`);
            console.log(`URL: http://localhost:${this.port}`);
            console.log(`Health: http://localhost:${this.port}/health`);
            console.log(`Registry: http://localhost:${this.port}/registry`);
            console.log(`Dashboard: http://localhost:${this.port}/api/dashboard`);
            console.log(`Architecture: Microservices with NoSQL`);
            console.log(`Domain: Sistema de Lista de Compras`);
            console.log('=====================================');
            console.log('📋 Rotas disponíveis:');
            console.log('   🔐 Auth Service:');
            console.log('      POST /api/auth/register - Cadastro de usuário');
            console.log('      POST /api/auth/login - Login');
            console.log('   👤 User Service:');
            console.log('      GET  /api/users/:id - Buscar usuário');
            console.log('      PUT  /api/users/:id - Atualizar perfil');
            console.log('   🛍️  Item Service:');
            console.log('      GET  /api/items - Listar itens');
            console.log('      POST /api/items - Criar item');
            console.log('      GET  /api/categories - Listar categorias');
            console.log('   📝 List Service:');
            console.log('      GET  /api/lists - Listar listas');
            console.log('      POST /api/lists - Criar lista');
            console.log('      GET  /api/lists/:id/summary - Resumo da lista');
            console.log('   🔍 Endpoints agregados:');
            console.log('      GET  /api/search?q=termo - Busca global');
            console.log('      GET  /api/dashboard - Dashboard do usuário');
            console.log('=====================================');
        });
    }
}

// Start gateway
if (require.main === module) {
    const gateway = new APIGateway();
    gateway.start();

    // Graceful shutdown
    process.on('SIGTERM', () => process.exit(0));
    process.on('SIGINT', () => process.exit(0));
}

module.exports = APIGateway;