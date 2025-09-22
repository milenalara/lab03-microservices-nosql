const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Importar banco NoSQL, service registry e modelo de usuário
const JsonDatabase = require('../../shared/JsonDatabase');
const serviceRegistry = require('../../shared/serviceRegistry');
const UserModel = require('./models/UserModel');

class UserService {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3001;
        this.serviceName = 'user-service';
        this.serviceUrl = `http://localhost:${this.port}`;
        
        this.setupDatabase();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.seedInitialData();
    }

    setupDatabase() {
        const dbPath = path.join(__dirname, 'database');
        this.usersDb = new JsonDatabase(dbPath, 'users');
        console.log('User Service: Banco NoSQL inicializado');
    }

    async seedInitialData() {
        // Aguardar inicialização e criar usuário admin se não existir
        setTimeout(async () => {
            try {
                const existingUsers = await this.usersDb.find();
                
                if (existingUsers.length === 0) {
                    // Criar usuário admin usando o novo schema
                    const adminUser = await UserModel.createUser({
                        email: 'admin@lista-compras.com',
                        username: 'admin',
                        password: 'admin123',
                        firstName: 'Administrador',
                        lastName: 'Sistema',
                        preferences: {
                            defaultStore: 'Supermercado Central',
                            currency: 'BRL'
                        }
                    });

                    await this.usersDb.create(adminUser);
                    console.log('✅ Usuário administrador criado:');
                    console.log(`   Email: ${adminUser.email}`);
                    console.log(`   Username: ${adminUser.username}`);
                    console.log(`   Password: admin123`);
                    console.log(`   Schema validado: ${UserModel.validateSchema(adminUser)}`);
                }
            } catch (error) {
                console.error('Erro ao criar dados iniciais:', error.message);
            }
        }, 1000);
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(morgan('combined'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Service info headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Service', this.serviceName);
            res.setHeader('X-Service-Version', '1.0.0');
            res.setHeader('X-Database', 'JSON-NoSQL');
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', async (req, res) => {
            try {
                const userCount = await this.usersDb.count();
                res.json({
                    service: this.serviceName,
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    version: '1.0.0',
                    database: {
                        type: 'JSON-NoSQL',
                        userCount: userCount
                    }
                });
            } catch (error) {
                res.status(503).json({
                    service: this.serviceName,
                    status: 'unhealthy',
                    error: error.message
                });
            }
        });

        // Service info
        this.app.get('/', (req, res) => {
            res.json({
                service: 'User Service - Lista de Compras',
                version: '1.0.0',
                description: 'Microsserviço para gerenciamento de usuários - Sistema de Lista de Compras',
                database: 'JSON-NoSQL',
                domain: 'Lista de Compras - PUC Minas',
                schema: UserModel.getSchemaExample(),
                endpoints: [
                    'POST /auth/register - Cadastro de usuário',
                    'POST /auth/login - Login com email/username + senha', 
                    'POST /auth/validate - Validar token JWT',
                    'GET /users/:id - Buscar dados do usuário',
                    'PUT /users/:id - Atualizar perfil do usuário',
                    'GET /search - Buscar usuários'
                ]
            });
        });

        // Auth routes
        this.app.post('/auth/register', this.register.bind(this));
        this.app.post('/auth/login', this.login.bind(this));
        this.app.post('/auth/validate', this.validateToken.bind(this));

        // User routes (protected)
        this.app.get('/users', this.authMiddleware.bind(this), this.getUsers.bind(this));
        this.app.get('/users/:id', this.authMiddleware.bind(this), this.getUser.bind(this));
        this.app.put('/users/:id', this.authMiddleware.bind(this), this.updateUser.bind(this));
        
        // Search route
        this.app.get('/search', this.authMiddleware.bind(this), this.searchUsers.bind(this));
    }

    setupErrorHandling() {
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint não encontrado',
                service: this.serviceName
            });
        });

        this.app.use((error, req, res, next) => {
            console.error('User Service Error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do serviço',
                service: this.serviceName
            });
        });
    }

    // Auth middleware
    authMiddleware(req, res, next) {
        const authHeader = req.header('Authorization');
        
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token obrigatório'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'user-secret');
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
    }

    // Register user
    async register(req, res) {
        try {
            const { email, username, password, firstName, lastName, preferences } = req.body;

            // Validações usando UserModel
            try {
                UserModel.validateRequiredFields({ email, username, password, firstName, lastName });
                UserModel.validateEmail(email);
            } catch (validationError) {
                return res.status(400).json({
                    success: false,
                    message: validationError.message
                });
            }

            // Verificar se usuário já existe
            const existingEmail = await this.usersDb.findOne({ email: email.toLowerCase() });
            const existingUsername = await this.usersDb.findOne({ username: username.toLowerCase() });

            if (existingEmail) {
                return res.status(409).json({
                    success: false,
                    message: 'Email já está em uso'
                });
            }

            if (existingUsername) {
                return res.status(409).json({
                    success: false,
                    message: 'Username já está em uso'
                });
            }

            // Criar usuário usando o UserModel
            const newUser = await UserModel.createUser({
                email,
                username,
                password,
                firstName,
                lastName,
                preferences: preferences || {
                    defaultStore: "",
                    currency: "BRL"
                }
            });

            // Salvar no banco
            await this.usersDb.create(newUser);

            // Remover senha da resposta
            const userResponse = UserModel.toSafeUser(newUser);

            // Gerar token JWT
            const token = jwt.sign(
                { 
                    id: newUser.id, 
                    email: newUser.email, 
                    username: newUser.username
                },
                process.env.JWT_SECRET || 'user-secret',
                { expiresIn: '24h' }
            );

            res.status(201).json({
                success: true,
                message: 'Usuário criado com sucesso',
                data: { 
                    user: userResponse, 
                    token,
                    schema: 'Lista de Compras - PUC Minas'
                }
            });
        } catch (error) {
            console.error('Erro no registro:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Login user
    async login(req, res) {
        try {
            const { identifier, password } = req.body;

            if (!identifier || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email/username e senha são obrigatórios'
                });
            }

            // Buscar usuário por email ou username
            const user = await this.usersDb.findOne({
                $or: [
                    { email: identifier.toLowerCase() },
                    { username: identifier.toLowerCase() }
                ]
            });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            // Verificar senha usando UserModel
            const isPasswordValid = await UserModel.verifyPassword(password, user.password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas'
                });
            }

            // Gerar token JWT
            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email, 
                    username: user.username
                },
                process.env.JWT_SECRET || 'user-secret',
                { expiresIn: '24h' }
            );

            // Atualizar timestamp de último login
            const updatedUser = await UserModel.updateUser(user, {
                preferences: {
                    ...user.preferences,
                    lastLogin: new Date().toISOString()
                }
            });
            
            await this.usersDb.update(user.id, updatedUser);

            // Remover senha da resposta
            const userResponse = UserModel.toSafeUser(user);

            res.json({
                success: true,
                message: 'Login realizado com sucesso',
                data: { 
                    user: userResponse, 
                    token,
                    schema: 'Lista de Compras - PUC Minas'
                }
            });
        } catch (error) {
            console.error('Erro no login:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Validate token
    async validateToken(req, res) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token obrigatório'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'user-secret');
            const user = await this.usersDb.findById(decoded.id);

            if (!user || user.status !== 'active') {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não encontrado ou inativo'
                });
            }

            const { password: _, ...userWithoutPassword } = user;

            res.json({
                success: true,
                message: 'Token válido',
                data: { user: userWithoutPassword }
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }
    }

    // Get users (com paginação)
    async getUsers(req, res) {
        try {
            const { page = 1, limit = 10, role, status } = req.query;
            const skip = (page - 1) * parseInt(limit);

            // Filtros NoSQL flexíveis
            const filter = {};
            if (role) filter.role = role;
            if (status) filter.status = status;

            const users = await this.usersDb.find(filter, {
                skip: skip,
                limit: parseInt(limit),
                sort: { createdAt: -1 }
            });

            // Remove passwords
            const safeUsers = users.map(user => {
                const { password, ...safeUser } = user;
                return safeUser;
            });

            const total = await this.usersDb.count(filter);

            res.json({
                success: true,
                data: safeUsers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Get user by ID
    async getUser(req, res) {
        try {
            const { id } = req.params;
            const user = await this.usersDb.findById(id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }

            // Verificar permissão (usuário só vê próprio perfil)
            if (req.user.id !== id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado - você só pode ver seu próprio perfil'
                });
            }

            // Validar schema e remover dados sensíveis
            const isValidSchema = UserModel.validateSchema(user);
            const userResponse = UserModel.toSafeUser(user);

            res.json({
                success: true,
                data: userResponse,
                schema: {
                    valid: isValidSchema,
                    domain: 'Lista de Compras - PUC Minas'
                }
            });
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Update user - conforme schema da lista de compras
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Verificar permissão (usuário só pode atualizar próprio perfil)
            if (req.user.id !== id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado - você só pode atualizar seu próprio perfil'
                });
            }

            const user = await this.usersDb.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }

            // Usar UserModel para validar e atualizar
            try {
                const updatedUser = await UserModel.updateUser(user, updateData);
                
                // Verificar se novo email é único (se foi alterado)
                if (updateData.email && updateData.email.toLowerCase() !== user.email) {
                    const existingEmail = await this.usersDb.findOne({ 
                        email: updateData.email.toLowerCase(),
                        id: { $ne: id }
                    });
                    
                    if (existingEmail) {
                        return res.status(409).json({
                            success: false,
                            message: 'Email já está em uso por outro usuário'
                        });
                    }
                }

                // Verificar se novo username é único (se foi alterado)
                if (updateData.username && updateData.username.toLowerCase() !== user.username) {
                    const existingUsername = await this.usersDb.findOne({ 
                        username: updateData.username.toLowerCase(),
                        id: { $ne: id }
                    });
                    
                    if (existingUsername) {
                        return res.status(409).json({
                            success: false,
                            message: 'Username já está em uso por outro usuário'
                        });
                    }
                }

                // Salvar no banco
                await this.usersDb.update(id, updatedUser);
                
                // Validar schema e remover dados sensíveis
                const isValidSchema = UserModel.validateSchema(updatedUser);
                const userResponse = UserModel.toSafeUser(updatedUser);

                res.json({
                    success: true,
                    message: 'Usuário atualizado com sucesso',
                    data: userResponse,
                    schema: {
                        valid: isValidSchema,
                        domain: 'Lista de Compras - PUC Minas'
                    }
                });
            } catch (validationError) {
                return res.status(400).json({
                    success: false,
                    message: validationError.message
                });
            }
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Search users (demonstrando busca NoSQL)
    async searchUsers(req, res) {
        try {
            const { q, limit = 10 } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetro de busca "q" é obrigatório'
                });
            }

            // Busca full-text NoSQL
            const users = await this.usersDb.search(q, ['firstName', 'lastName', 'username', 'email']);
            
            // Filtrar apenas usuários ativos e remover passwords
            const safeUsers = users
                .filter(user => user.status === 'active')
                .slice(0, parseInt(limit))
                .map(user => {
                    const { password, ...safeUser } = user;
                    return safeUser;
                });

            res.json({
                success: true,
                data: {
                    query: q,
                    results: safeUsers,
                    total: safeUsers.length
                }
            });
        } catch (error) {
            console.error('Erro na busca de usuários:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Register with service registry
    registerWithRegistry() {
        serviceRegistry.register(this.serviceName, {
            url: this.serviceUrl,
            version: '1.0.0',
            database: 'JSON-NoSQL',
            endpoints: ['/health', '/auth/register', '/auth/login', '/users', '/search']
        });
    }

    // Start health check reporting
    startHealthReporting() {
        setInterval(() => {
            serviceRegistry.updateHealth(this.serviceName, true);
        }, 30000);
    }

    start() {
        this.app.listen(this.port, () => {
            console.log('=====================================');
            console.log(`User Service iniciado na porta ${this.port}`);
            console.log(`URL: ${this.serviceUrl}`);
            console.log(`Health: ${this.serviceUrl}/health`);
            console.log(`Database: JSON-NoSQL`);
            console.log('=====================================');
            
            // Register with service registry
            this.registerWithRegistry();
            this.startHealthReporting();
        });
    }
}

// Start service
if (require.main === module) {
    const userService = new UserService();
    userService.start();

    // Graceful shutdown
    process.on('SIGTERM', () => {
        serviceRegistry.unregister('user-service');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        serviceRegistry.unregister('user-service');
        process.exit(0);
    });
}

module.exports = UserService;