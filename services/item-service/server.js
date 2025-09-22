const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const path = require('path');

// Importar banco NoSQL, service registry e modelo de item
const JsonDatabase = require('../../shared/JsonDatabase');
const serviceRegistry = require('../../shared/serviceRegistry');
const ItemModel = require('./models/ItemModel');

class ItemService {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3003;
        this.serviceName = 'item-service';
        this.serviceUrl = `http://localhost:${this.port}`;
        
        this.setupDatabase();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.seedInitialData();
    }

    setupDatabase() {
        const dbPath = path.join(__dirname, 'database');
        this.itemsDb = new JsonDatabase(dbPath, 'items');
        console.log('Item Service: Banco NoSQL inicializado');
    }

    async seedInitialData() {
        // Aguardar inicialização e criar itens se não existirem
        setTimeout(async () => {
            try {
                const existingItems = await this.itemsDb.find();
                
                if (existingItems.length === 0) {
                    console.log('🌱 Criando dados iniciais para Item Service...');
                    await this.createInitialItems();
                    console.log('✅ Dados iniciais criados com sucesso!');
                }
            } catch (error) {
                console.error('Erro ao criar dados iniciais:', error.message);
            }
        }, 1000);
    }

    async createInitialItems() {
        const initialItems = [
            // Alimentos
            { name: 'Arroz Branco', category: 'Alimentos', brand: 'Tio João', unit: 'kg', averagePrice: 4.50, barcode: '7891234567890', description: 'Arroz branco tipo 1' },
            { name: 'Feijão Preto', category: 'Alimentos', brand: 'Camil', unit: 'kg', averagePrice: 8.90, barcode: '7891234567891', description: 'Feijão preto premium' },
            { name: 'Açúcar Cristal', category: 'Alimentos', brand: 'União', unit: 'kg', averagePrice: 3.20, barcode: '7891234567892', description: 'Açúcar cristal especial' },
            { name: 'Óleo de Soja', category: 'Alimentos', brand: 'Soya', unit: 'litro', averagePrice: 6.80, barcode: '7891234567893', description: 'Óleo de soja refinado' },
            { name: 'Macarrão Espaguete', category: 'Alimentos', brand: 'Barilla', unit: 'pacote', averagePrice: 4.20, barcode: '7891234567894', description: 'Macarrão espaguete 500g' },
            { name: 'Leite Integral', category: 'Alimentos', brand: 'Nestlé', unit: 'litro', averagePrice: 4.50, barcode: '7891234567895', description: 'Leite integral UHT' },
            
            // Limpeza
            { name: 'Detergente Neutro', category: 'Limpeza', brand: 'Ypê', unit: 'un', averagePrice: 2.90, barcode: '7891234567896', description: 'Detergente neutro 500ml' },
            { name: 'Sabão em Pó', category: 'Limpeza', brand: 'OMO', unit: 'caixa', averagePrice: 12.50, barcode: '7891234567897', description: 'Sabão em pó concentrado 1kg' },
            { name: 'Desinfetante', category: 'Limpeza', brand: 'Pinho Sol', unit: 'litro', averagePrice: 8.90, barcode: '7891234567898', description: 'Desinfetante pinho 1L' },
            { name: 'Água Sanitária', category: 'Limpeza', brand: 'Qboa', unit: 'litro', averagePrice: 3.50, barcode: '7891234567899', description: 'Água sanitária 1L' },
            { name: 'Esponja de Aço', category: 'Limpeza', brand: 'Bombril', unit: 'pacote', averagePrice: 4.90, barcode: '7891234567800', description: 'Esponja de aço pacote com 8' },
            
            // Higiene
            { name: 'Shampoo Anticaspa', category: 'Higiene', brand: 'Head & Shoulders', unit: 'un', averagePrice: 12.90, barcode: '7891234567801', description: 'Shampoo anticaspa 400ml' },
            { name: 'Sabonete Líquido', category: 'Higiene', brand: 'Dove', unit: 'un', averagePrice: 8.50, barcode: '7891234567802', description: 'Sabonete líquido hidratante' },
            { name: 'Creme Dental', category: 'Higiene', brand: 'Colgate', unit: 'un', averagePrice: 4.20, barcode: '7891234567803', description: 'Creme dental total 12 90g' },
            { name: 'Papel Higiênico', category: 'Higiene', brand: 'Scott', unit: 'pacote', averagePrice: 15.90, barcode: '7891234567804', description: 'Papel higiênico folha dupla 12 rolos' },
            { name: 'Desodorante', category: 'Higiene', brand: 'Rexona', unit: 'un', averagePrice: 8.90, barcode: '7891234567805', description: 'Desodorante aerosol 150ml' },
            
            // Bebidas
            { name: 'Refrigerante Cola', category: 'Bebidas', brand: 'Coca-Cola', unit: 'litro', averagePrice: 6.50, barcode: '7891234567806', description: 'Refrigerante cola 2L' },
            { name: 'Suco de Laranja', category: 'Bebidas', brand: 'Tang', unit: 'pacote', averagePrice: 3.90, barcode: '7891234567807', description: 'Suco em pó sabor laranja' },
            { name: 'Água Mineral', category: 'Bebidas', brand: 'Crystal', unit: 'garrafa', averagePrice: 2.50, barcode: '7891234567808', description: 'Água mineral sem gás 1,5L' },
            { name: 'Cerveja Lager', category: 'Bebidas', brand: 'Brahma', unit: 'lata', averagePrice: 3.20, barcode: '7891234567809', description: 'Cerveja lager 350ml' },
            { name: 'Energético', category: 'Bebidas', brand: 'Red Bull', unit: 'lata', averagePrice: 8.90, barcode: '7891234567810', description: 'Energético 250ml' },
            
            // Padaria
            { name: 'Pão Francês', category: 'Padaria', brand: 'Artesanal', unit: 'kg', averagePrice: 8.50, barcode: '7891234567811', description: 'Pão francês tradicional' },
            { name: 'Pão de Forma', category: 'Padaria', brand: 'Pullman', unit: 'pacote', averagePrice: 5.90, barcode: '7891234567812', description: 'Pão de forma integral' },
            { name: 'Croissant', category: 'Padaria', brand: 'Padaria Central', unit: 'un', averagePrice: 3.50, barcode: '7891234567813', description: 'Croissant artesanal' },
            { name: 'Bolo de Chocolate', category: 'Padaria', brand: 'Padaria Central', unit: 'un', averagePrice: 15.90, barcode: '7891234567814', description: 'Bolo de chocolate individual' }
        ];

        for (const itemData of initialItems) {
            try {
                const item = ItemModel.createItem(itemData);
                await this.itemsDb.create(item);
            } catch (error) {
                console.error(`Erro ao criar item ${itemData.name}:`, error.message);
            }
        }
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
            res.setHeader('X-Domain', 'Shopping-List-Items');
            next();
        });
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', async (req, res) => {
            try {
                const itemCount = await this.itemsDb.count();
                const activeItems = await this.itemsDb.count({ active: true });
                
                res.json({
                    service: this.serviceName,
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    version: '1.0.0',
                    database: {
                        type: 'JSON-NoSQL',
                        itemCount: itemCount,
                        activeItems: activeItems
                    },
                    categories: ItemModel.VALID_CATEGORIES.length
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
                service: 'Item Service',
                version: '1.0.0',
                description: 'Microsserviço para catálogo de itens/produtos - Sistema Lista de Compras',
                database: 'JSON-NoSQL',
                domain: 'Shopping List Items Management',
                categories: ItemModel.VALID_CATEGORIES,
                units: ItemModel.VALID_UNITS,
                endpoints: [
                    'GET /items - Listar itens com filtros',
                    'GET /items/:id - Buscar item específico',
                    'POST /items - Criar novo item (auth)',
                    'PUT /items/:id - Atualizar item (auth)',
                    'GET /categories - Listar categorias',
                    'GET /search?q=termo - Buscar itens'
                ]
            });
        });

        // Item routes
        this.app.get('/items', this.getItems.bind(this));
        this.app.get('/items/:id', this.getItem.bind(this));
        this.app.post('/items', this.authMiddleware.bind(this), this.createItem.bind(this));
        this.app.put('/items/:id', this.authMiddleware.bind(this), this.updateItem.bind(this));
        
        // Special routes
        this.app.get('/categories', this.getCategories.bind(this));
        this.app.get('/search', this.searchItems.bind(this));
    }

    setupErrorHandling() {
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint não encontrado',
                service: this.serviceName,
                availableEndpoints: [
                    'GET /items',
                    'GET /items/:id',
                    'POST /items',
                    'PUT /items/:id',
                    'GET /categories',
                    'GET /search'
                ]
            });
        });

        this.app.use((error, req, res, next) => {
            console.error('Item Service Error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do serviço',
                service: this.serviceName
            });
        });
    }

    // Auth middleware (JWT validation)
    authMiddleware(req, res, next) {
        const authHeader = req.header('Authorization');
        
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token obrigatório para criar/atualizar itens'
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

    // Get items with filters
    async getItems(req, res) {
        try {
            const { 
                page = 1, 
                limit = 20, 
                category, 
                name, 
                brand, 
                active = true,
                minPrice,
                maxPrice
            } = req.query;
            
            const skip = (page - 1) * parseInt(limit);

            // Buscar todos os itens
            let items = await this.itemsDb.find();

            // Aplicar filtros usando ItemModel
            const filters = {
                category,
                name,
                brand,
                active: active !== undefined ? JSON.parse(active) : undefined,
                minPrice,
                maxPrice
            };

            items = ItemModel.filterItems(items, filters);

            // Paginação
            const total = items.length;
            const paginatedItems = items.slice(skip, skip + parseInt(limit));

            // Estatísticas das categorias
            const categoryStats = ItemModel.getCategoryStats(items);

            res.json({
                success: true,
                data: paginatedItems,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                filters: filters,
                categoryStats: categoryStats,
                schema: 'Lista de Compras - PUC Minas'
            });
        } catch (error) {
            console.error('Erro ao buscar itens:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Get item by ID
    async getItem(req, res) {
        try {
            const { id } = req.params;
            const item = await this.itemsDb.findById(id);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado'
                });
            }

            // Validar schema
            const isValidSchema = ItemModel.validateSchema(item);

            res.json({
                success: true,
                data: item,
                schema: {
                    valid: isValidSchema,
                    domain: 'Lista de Compras - PUC Minas'
                }
            });
        } catch (error) {
            console.error('Erro ao buscar item:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Create new item (requires authentication)
    async createItem(req, res) {
        try {
            const itemData = req.body;

            // Validar e criar item usando ItemModel
            try {
                const newItem = ItemModel.createItem(itemData);
                
                // Salvar no banco
                await this.itemsDb.create(newItem);

                // Validar schema
                const isValidSchema = ItemModel.validateSchema(newItem);

                res.status(201).json({
                    success: true,
                    message: 'Item criado com sucesso',
                    data: newItem,
                    createdBy: req.user.username || req.user.email,
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
            console.error('Erro ao criar item:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Update item (requires authentication)
    async updateItem(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const item = await this.itemsDb.findById(id);
            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado'
                });
            }

            // Usar ItemModel para validar e atualizar
            try {
                const updatedItem = ItemModel.updateItem(item, updateData);
                
                // Salvar no banco
                await this.itemsDb.update(id, updatedItem);
                
                // Validar schema
                const isValidSchema = ItemModel.validateSchema(updatedItem);

                res.json({
                    success: true,
                    message: 'Item atualizado com sucesso',
                    data: updatedItem,
                    updatedBy: req.user.username || req.user.email,
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
            console.error('Erro ao atualizar item:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Get categories
    async getCategories(req, res) {
        try {
            const items = await this.itemsDb.find({ active: true });
            const categoryStats = ItemModel.getCategoryStats(items);

            res.json({
                success: true,
                data: {
                    categories: ItemModel.VALID_CATEGORIES,
                    stats: categoryStats,
                    total: ItemModel.VALID_CATEGORIES.length
                },
                schema: 'Lista de Compras - PUC Minas'
            });
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Search items by name
    async searchItems(req, res) {
        try {
            const { q, limit = 10 } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetro de busca "q" é obrigatório'
                });
            }

            // Buscar itens usando o método search do banco
            const items = await this.itemsDb.search(q, ['name', 'brand', 'description', 'category']);
            
            // Filtrar apenas itens ativos
            const activeItems = items
                .filter(item => item.active)
                .slice(0, parseInt(limit));

            res.json({
                success: true,
                data: {
                    query: q,
                    results: activeItems,
                    total: activeItems.length
                },
                schema: 'Lista de Compras - PUC Minas'
            });
        } catch (error) {
            console.error('Erro na busca de itens:', error);
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
            domain: 'Shopping List Items',
            endpoints: ['/health', '/items', '/categories', '/search']
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
            console.log(`🛍️  Item Service iniciado na porta ${this.port}`);
            console.log(`URL: ${this.serviceUrl}`);
            console.log(`Health: ${this.serviceUrl}/health`);
            console.log(`Database: JSON-NoSQL`);
            console.log(`Domain: Shopping List Items Management`);
            console.log(`Categories: ${ItemModel.VALID_CATEGORIES.join(', ')}`);
            console.log('=====================================');
            console.log('📦 Endpoints disponíveis:');
            console.log('   GET  /items - Listar itens com filtros');
            console.log('   GET  /items/:id - Buscar item específico');
            console.log('   POST /items - Criar item (requer auth)');
            console.log('   PUT  /items/:id - Atualizar item (requer auth)');
            console.log('   GET  /categories - Listar categorias');
            console.log('   GET  /search?q=termo - Buscar itens');
            console.log('=====================================');
            
            // Register with service registry
            this.registerWithRegistry();
            this.startHealthReporting();
        });
    }
}

// Start service
if (require.main === module) {
    const itemService = new ItemService();
    itemService.start();

    // Graceful shutdown
    process.on('SIGTERM', () => {
        serviceRegistry.unregister('item-service');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        serviceRegistry.unregister('item-service');
        process.exit(0);
    });
}

module.exports = ItemService;
