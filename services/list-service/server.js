const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');

// Importar classes do projeto
const JsonDatabase = require('../../shared/JsonDatabase');
const serviceRegistry = require('../../shared/serviceRegistry');
const ListModel = require('./models/ListModel');

// Configurações
const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-key';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Configurar database
const dbPath = path.join(__dirname, 'data', 'lists.json');
const db = new JsonDatabase(dbPath);

// Middlewares
app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

/**
 * Middleware de autenticação JWT
 */
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({
            error: 'Token de acesso requerido',
            message: 'Inclua o token JWT no header Authorization: Bearer <token>'
        });
    }
    
    const token = authHeader.split(' ')[1]; // Remove "Bearer "
    
    if (!token) {
        return res.status(401).json({
            error: 'Token de acesso requerido',
            message: 'Formato: Authorization: Bearer <token>'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Erro na validação do JWT:', error.message);
        return res.status(403).json({
            error: 'Token inválido',
            message: 'Token JWT expirado ou malformado'
        });
    }
};

/**
 * Função para buscar item no Item Service via Service Registry
 */
async function getItemFromCatalog(itemId) {
    try {
        // Buscar Item Service no registry
        const itemService = serviceRegistry.discover('item-service');
        
        if (!itemService) {
            console.error('Item Service não encontrado no registry');
            throw new Error('Item Service indisponível');
        }
        
        // Fazer requisição para o Item Service
        const response = await axios.get(`${itemService.url}/items/${itemId}`, {
            timeout: 5000
        });
        
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar item:', error.message);
        
        if (error.response && error.response.status === 404) {
            throw new Error('Item não encontrado no catálogo');
        }
        
        throw new Error('Erro ao comunicar com Item Service');
    }
}

// Endpoint de Health Check
app.get('/health', (req, res) => {
    res.json({
        service: 'list-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT,
        environment: ENVIRONMENT,
        version: '1.0.0'
    });
});

// Endpoint para informações do serviço
app.get('/info', (req, res) => {
    res.json({
        service: 'List Service',
        description: 'Microservice for managing shopping lists',
        version: '1.0.0',
        endpoints: {
            'GET /health': 'Health check endpoint',
            'GET /info': 'Service information',
            'GET /lists': 'Get user lists (authenticated)',
            'POST /lists': 'Create new list (authenticated)',
            'GET /lists/:id': 'Get specific list (authenticated)',
            'PUT /lists/:id': 'Update list (authenticated)',
            'DELETE /lists/:id': 'Delete list (authenticated)',
            'POST /lists/:id/items': 'Add item to list (authenticated)',
            'PUT /lists/:id/items/:itemId': 'Update item in list (authenticated)',
            'DELETE /lists/:id/items/:itemId': 'Remove item from list (authenticated)',
            'GET /lists/:id/summary': 'Get list summary (authenticated)',
            'GET /stats': 'Get user lists statistics (authenticated)'
        },
        database: 'JSON NoSQL',
        authentication: 'JWT Bearer Token'
    });
});

// Endpoint para obter schema da lista
app.get('/schema', (req, res) => {
    res.json({
        schema: ListModel.getSchemaExample(),
        validStatuses: ListModel.VALID_STATUSES,
        description: 'Schema completo para listas de compras'
    });
});

/**
 * GET /lists - Obter todas as listas do usuário
 */
app.get('/lists', authenticateJWT, (req, res) => {
    try {
        const userId = req.user.userId;
        const { status, name, description } = req.query;
        
        // Buscar todas as listas
        const allLists = db.findAll();
        
        // Filtrar por usuário
        const userLists = allLists.filter(list => list.userId === userId);
        
        // Aplicar filtros opcionais
        const filters = {};
        if (status) filters.status = status;
        if (name) filters.name = name;
        if (description) filters.description = description;
        
        const filteredLists = ListModel.filterLists(userLists, filters);
        
        res.json({
            lists: filteredLists,
            total: filteredLists.length,
            filters: filters
        });
    } catch (error) {
        console.error('Erro ao buscar listas:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao buscar listas do usuário'
        });
    }
});

/**
 * POST /lists - Criar nova lista
 */
app.post('/lists', authenticateJWT, (req, res) => {
    try {
        const userId = req.user.userId;
        const listData = req.body;
        
        // Criar lista usando o modelo
        const newList = ListModel.createList(listData, userId);
        
        // Salvar no banco
        const savedList = db.create(newList);
        
        console.log(`Lista criada: ${savedList.name} (ID: ${savedList.id})`);
        
        res.status(201).json({
            message: 'Lista criada com sucesso',
            list: savedList
        });
    } catch (error) {
        console.error('Erro ao criar lista:', error);
        
        if (error.message.includes('obrigatório') || error.message.includes('inválido')) {
            return res.status(400).json({
                error: 'Dados inválidos',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao criar lista'
        });
    }
});

/**
 * GET /lists/:id - Obter lista específica
 */
app.get('/lists/:id', authenticateJWT, (req, res) => {
    try {
        const listId = req.params.id;
        const userId = req.user.userId;
        
        const list = db.findById(listId);
        
        if (!list) {
            return res.status(404).json({
                error: 'Lista não encontrada',
                message: 'Lista com ID especificado não existe'
            });
        }
        
        // Verificar propriedade
        if (list.userId !== userId) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você não tem permissão para acessar esta lista'
            });
        }
        
        res.json({
            list: list
        });
    } catch (error) {
        console.error('Erro ao buscar lista:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao buscar lista'
        });
    }
});

/**
 * PUT /lists/:id - Atualizar lista
 */
app.put('/lists/:id', authenticateJWT, (req, res) => {
    try {
        const listId = req.params.id;
        const userId = req.user.userId;
        const updateData = req.body;
        
        const existingList = db.findById(listId);
        
        if (!existingList) {
            return res.status(404).json({
                error: 'Lista não encontrada',
                message: 'Lista com ID especificado não existe'
            });
        }
        
        // Verificar propriedade
        if (existingList.userId !== userId) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você não tem permissão para editar esta lista'
            });
        }
        
        // Atualizar lista usando o modelo
        const updatedList = ListModel.updateList(existingList, updateData);
        
        // Salvar no banco
        const savedList = db.update(listId, updatedList);
        
        console.log(`Lista atualizada: ${savedList.name} (ID: ${savedList.id})`);
        
        res.json({
            message: 'Lista atualizada com sucesso',
            list: savedList
        });
    } catch (error) {
        console.error('Erro ao atualizar lista:', error);
        
        if (error.message.includes('obrigatório') || error.message.includes('inválido')) {
            return res.status(400).json({
                error: 'Dados inválidos',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao atualizar lista'
        });
    }
});

/**
 * DELETE /lists/:id - Excluir lista
 */
app.delete('/lists/:id', authenticateJWT, (req, res) => {
    try {
        const listId = req.params.id;
        const userId = req.user.userId;
        
        const existingList = db.findById(listId);
        
        if (!existingList) {
            return res.status(404).json({
                error: 'Lista não encontrada',
                message: 'Lista com ID especificado não existe'
            });
        }
        
        // Verificar propriedade
        if (existingList.userId !== userId) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você não tem permissão para excluir esta lista'
            });
        }
        
        // Excluir do banco
        db.delete(listId);
        
        console.log(`Lista excluída: ${existingList.name} (ID: ${listId})`);
        
        res.json({
            message: 'Lista excluída com sucesso',
            deletedList: {
                id: existingList.id,
                name: existingList.name
            }
        });
    } catch (error) {
        console.error('Erro ao excluir lista:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao excluir lista'
        });
    }
});

/**
 * POST /lists/:id/items - Adicionar item à lista
 */
app.post('/lists/:id/items', authenticateJWT, async (req, res) => {
    try {
        const listId = req.params.id;
        const userId = req.user.userId;
        const itemData = req.body;
        
        // Validar se itemId foi fornecido
        if (!itemData.itemId) {
            return res.status(400).json({
                error: 'Dados inválidos',
                message: 'Campo itemId é obrigatório'
            });
        }
        
        const existingList = db.findById(listId);
        
        if (!existingList) {
            return res.status(404).json({
                error: 'Lista não encontrada',
                message: 'Lista com ID especificado não existe'
            });
        }
        
        // Verificar propriedade
        if (existingList.userId !== userId) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você não tem permissão para editar esta lista'
            });
        }
        
        // Buscar item no catálogo via Item Service
        const catalogItem = await getItemFromCatalog(itemData.itemId);
        
        // Adicionar item à lista usando o modelo
        const updatedList = ListModel.addItemToList(existingList, itemData, catalogItem);
        
        // Salvar no banco
        const savedList = db.update(listId, updatedList);
        
        console.log(`Item adicionado à lista: ${catalogItem.name} -> ${savedList.name}`);
        
        res.status(201).json({
            message: 'Item adicionado à lista com sucesso',
            list: savedList,
            addedItem: savedList.items[savedList.items.length - 1]
        });
    } catch (error) {
        console.error('Erro ao adicionar item à lista:', error);
        
        if (error.message.includes('já existe') || 
            error.message.includes('obrigatório') || 
            error.message.includes('inválido') ||
            error.message.includes('não encontrado')) {
            return res.status(400).json({
                error: 'Dados inválidos',
                message: error.message
            });
        }
        
        if (error.message.includes('Item Service')) {
            return res.status(503).json({
                error: 'Serviço indisponível',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao adicionar item à lista'
        });
    }
});

/**
 * PUT /lists/:id/items/:itemId - Atualizar item na lista
 */
app.put('/lists/:id/items/:itemId', authenticateJWT, (req, res) => {
    try {
        const listId = req.params.id;
        const itemId = req.params.itemId;
        const userId = req.user.userId;
        const updateData = req.body;
        
        const existingList = db.findById(listId);
        
        if (!existingList) {
            return res.status(404).json({
                error: 'Lista não encontrada',
                message: 'Lista com ID especificado não existe'
            });
        }
        
        // Verificar propriedade
        if (existingList.userId !== userId) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você não tem permissão para editar esta lista'
            });
        }
        
        // Atualizar item na lista usando o modelo
        const updatedList = ListModel.updateItemInList(existingList, itemId, updateData);
        
        // Salvar no banco
        const savedList = db.update(listId, updatedList);
        
        // Encontrar o item atualizado
        const updatedItem = savedList.items.find(item => item.itemId === itemId);
        
        console.log(`Item atualizado na lista: ${updatedItem.itemName} -> ${savedList.name}`);
        
        res.json({
            message: 'Item atualizado com sucesso',
            list: savedList,
            updatedItem: updatedItem
        });
    } catch (error) {
        console.error('Erro ao atualizar item na lista:', error);
        
        if (error.message.includes('não encontrado') || 
            error.message.includes('inválido') ||
            error.message.includes('obrigatório')) {
            return res.status(400).json({
                error: 'Dados inválidos',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao atualizar item na lista'
        });
    }
});

/**
 * DELETE /lists/:id/items/:itemId - Remover item da lista
 */
app.delete('/lists/:id/items/:itemId', authenticateJWT, (req, res) => {
    try {
        const listId = req.params.id;
        const itemId = req.params.itemId;
        const userId = req.user.userId;
        
        const existingList = db.findById(listId);
        
        if (!existingList) {
            return res.status(404).json({
                error: 'Lista não encontrada',
                message: 'Lista com ID especificado não existe'
            });
        }
        
        // Verificar propriedade
        if (existingList.userId !== userId) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você não tem permissão para editar esta lista'
            });
        }
        
        // Encontrar item antes de remover (para log)
        const itemToRemove = existingList.items.find(item => item.itemId === itemId);
        
        if (!itemToRemove) {
            return res.status(404).json({
                error: 'Item não encontrado',
                message: 'Item não existe nesta lista'
            });
        }
        
        // Remover item da lista usando o modelo
        const updatedList = ListModel.removeItemFromList(existingList, itemId);
        
        // Salvar no banco
        const savedList = db.update(listId, updatedList);
        
        console.log(`Item removido da lista: ${itemToRemove.itemName} -> ${savedList.name}`);
        
        res.json({
            message: 'Item removido da lista com sucesso',
            list: savedList,
            removedItem: {
                itemId: itemToRemove.itemId,
                itemName: itemToRemove.itemName
            }
        });
    } catch (error) {
        console.error('Erro ao remover item da lista:', error);
        
        if (error.message.includes('não encontrado')) {
            return res.status(404).json({
                error: 'Item não encontrado',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao remover item da lista'
        });
    }
});

/**
 * GET /lists/:id/summary - Obter resumo da lista
 */
app.get('/lists/:id/summary', authenticateJWT, (req, res) => {
    try {
        const listId = req.params.id;
        const userId = req.user.userId;
        
        const list = db.findById(listId);
        
        if (!list) {
            return res.status(404).json({
                error: 'Lista não encontrada',
                message: 'Lista com ID especificado não existe'
            });
        }
        
        // Verificar propriedade
        if (list.userId !== userId) {
            return res.status(403).json({
                error: 'Acesso negado',
                message: 'Você não tem permissão para acessar esta lista'
            });
        }
        
        // Recalcular summary para garantir precisão
        const currentSummary = ListModel.calculateSummary(list.items);
        
        res.json({
            listId: list.id,
            listName: list.name,
            summary: currentSummary,
            status: list.status,
            lastUpdated: list.updatedAt
        });
    } catch (error) {
        console.error('Erro ao obter resumo da lista:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao obter resumo da lista'
        });
    }
});

/**
 * GET /stats - Obter estatísticas das listas do usuário
 */
app.get('/stats', authenticateJWT, (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Buscar todas as listas do usuário
        const allLists = db.findAll();
        const userLists = allLists.filter(list => list.userId === userId);
        
        // Calcular estatísticas
        const stats = ListModel.getListStats(userLists);
        
        res.json({
            userId: userId,
            statistics: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erro ao obter estatísticas:', error);
        res.status(500).json({
            error: 'Erro interno do servidor',
            message: 'Erro ao obter estatísticas das listas'
        });
    }
});

// Middleware de tratamento de rotas não encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint não encontrado',
        message: `Rota ${req.method} ${req.originalUrl} não existe`,
        service: 'list-service',
        availableEndpoints: [
            'GET /health',
            'GET /info',
            'GET /schema',
            'GET /lists',
            'POST /lists',
            'GET /lists/:id',
            'PUT /lists/:id',
            'DELETE /lists/:id',
            'POST /lists/:id/items',
            'PUT /lists/:id/items/:itemId',
            'DELETE /lists/:id/items/:itemId',
            'GET /lists/:id/summary',
            'GET /stats'
        ]
    });
});

// Middleware de tratamento global de erros
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro inesperado no servidor',
        timestamp: new Date().toISOString()
    });
});

// Inicializar servidor
async function startServer() {
    try {
        // Registrar serviço no registry
        serviceRegistry.register('list-service', {
            url: `http://localhost:${PORT}`,
            port: PORT,
            status: 'healthy'
        });
        
        console.log('Service Registry configurado');
        
        // Inicializar banco de dados
        console.log('Inicializando banco de dados...');
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`🛍️  List Service rodando na porta ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`📋 Informações: http://localhost:${PORT}/info`);
            console.log(`📐 Schema: http://localhost:${PORT}/schema`);
            console.log(`🔐 Autenticação: JWT Bearer Token obrigatório`);
            console.log('✅ Serviço pronto para receber requisições!');
        });
    } catch (error) {
        console.error('❌ Erro ao inicializar List Service:', error);
        process.exit(1);
    }
}

// Tratamento de sinais do sistema
process.on('SIGINT', () => {
    console.log('\n🛑 Recebido SIGINT. Finalizando List Service...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Recebido SIGTERM. Finalizando List Service...');
    process.exit(0);
});

// Inicializar servidor
startServer();