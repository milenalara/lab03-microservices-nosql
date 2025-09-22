const { v4: uuidv4 } = require('uuid');

/**
 * Schema e modelo para a lista de compras conforme especificação do documento
 * Sistema de Lista de Compras - List Service - PUC Minas
 */
class ListModel {
    /**
     * Status válidos para a lista
     */
    static VALID_STATUSES = [
        'active',
        'completed', 
        'archived'
    ];

    /**
     * Cria uma nova lista com o schema especificado
     * @param {Object} listData - Dados da lista
     * @param {string} userId - ID do usuário proprietário
     * @returns {Object} Lista formatada conforme schema
     */
    static createList(listData, userId) {
        // Validar campos obrigatórios
        this.validateRequiredFields(listData);
        
        // Validar status se fornecido
        if (listData.status) {
            this.validateStatus(listData.status);
        }
        
        // Criar objeto conforme schema
        const list = {
            id: uuidv4(),
            userId: userId,
            name: listData.name.trim(),
            description: listData.description ? listData.description.trim() : "",
            status: listData.status || 'active',
            items: [],
            summary: {
                totalItems: 0,
                purchasedItems: 0,
                estimatedTotal: 0
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return list;
    }
    
    /**
     * Atualiza uma lista existente
     * @param {Object} existingList - Lista existente
     * @param {Object} updateData - Dados para atualização
     * @returns {Object} Lista atualizada
     */
    static updateList(existingList, updateData) {
        const updatedList = { ...existingList };
        
        // Campos que podem ser atualizados
        if (updateData.name) {
            updatedList.name = updateData.name.trim();
        }
        
        if (updateData.description !== undefined) {
            updatedList.description = updateData.description ? updateData.description.trim() : "";
        }
        
        if (updateData.status) {
            this.validateStatus(updateData.status);
            updatedList.status = updateData.status;
        }
        
        // Atualizar timestamp
        updatedList.updatedAt = new Date().toISOString();
        
        // Recalcular summary
        updatedList.summary = this.calculateSummary(updatedList.items);
        
        return updatedList;
    }
    
    /**
     * Adiciona um item à lista
     * @param {Object} list - Lista existente
     * @param {Object} itemData - Dados do item da lista
     * @param {Object} catalogItem - Item do catálogo (do Item Service)
     * @returns {Object} Lista atualizada
     */
    static addItemToList(list, itemData, catalogItem) {
        // Validar dados do item
        this.validateItemData(itemData);
        
        // Verificar se item já existe na lista
        const existingItemIndex = list.items.findIndex(item => item.itemId === catalogItem.id);
        
        if (existingItemIndex !== -1) {
            throw new Error('Item já existe na lista. Use PUT para atualizar.');
        }
        
        // Criar item da lista
        const listItem = {
            itemId: catalogItem.id,
            itemName: catalogItem.name, // cache do nome
            quantity: parseFloat(itemData.quantity),
            unit: catalogItem.unit,
            estimatedPrice: parseFloat(itemData.estimatedPrice || catalogItem.averagePrice),
            purchased: Boolean(itemData.purchased || false),
            notes: itemData.notes ? itemData.notes.trim() : "",
            addedAt: new Date().toISOString()
        };
        
        // Adicionar à lista
        const updatedList = { ...list };
        updatedList.items = [...list.items, listItem];
        updatedList.updatedAt = new Date().toISOString();
        
        // Recalcular summary
        updatedList.summary = this.calculateSummary(updatedList.items);
        
        return updatedList;
    }
    
    /**
     * Atualiza um item na lista
     * @param {Object} list - Lista existente
     * @param {string} itemId - ID do item
     * @param {Object} updateData - Dados para atualização
     * @returns {Object} Lista atualizada
     */
    static updateItemInList(list, itemId, updateData) {
        const itemIndex = list.items.findIndex(item => item.itemId === itemId);
        
        if (itemIndex === -1) {
            throw new Error('Item não encontrado na lista');
        }
        
        // Atualizar item
        const updatedItems = [...list.items];
        const existingItem = updatedItems[itemIndex];
        
        if (updateData.quantity !== undefined) {
            const quantity = parseFloat(updateData.quantity);
            if (isNaN(quantity) || quantity <= 0) {
                throw new Error('Quantidade deve ser um número maior que zero');
            }
            updatedItems[itemIndex].quantity = quantity;
        }
        
        if (updateData.estimatedPrice !== undefined) {
            const price = parseFloat(updateData.estimatedPrice);
            if (isNaN(price) || price < 0) {
                throw new Error('Preço estimado deve ser um número maior ou igual a zero');
            }
            updatedItems[itemIndex].estimatedPrice = price;
        }
        
        if (updateData.purchased !== undefined) {
            updatedItems[itemIndex].purchased = Boolean(updateData.purchased);
        }
        
        if (updateData.notes !== undefined) {
            updatedItems[itemIndex].notes = updateData.notes ? updateData.notes.trim() : "";
        }
        
        // Criar lista atualizada
        const updatedList = { ...list };
        updatedList.items = updatedItems;
        updatedList.updatedAt = new Date().toISOString();
        
        // Recalcular summary
        updatedList.summary = this.calculateSummary(updatedList.items);
        
        return updatedList;
    }
    
    /**
     * Remove um item da lista
     * @param {Object} list - Lista existente
     * @param {string} itemId - ID do item
     * @returns {Object} Lista atualizada
     */
    static removeItemFromList(list, itemId) {
        const itemIndex = list.items.findIndex(item => item.itemId === itemId);
        
        if (itemIndex === -1) {
            throw new Error('Item não encontrado na lista');
        }
        
        // Remover item
        const updatedItems = list.items.filter(item => item.itemId !== itemId);
        
        // Criar lista atualizada
        const updatedList = { ...list };
        updatedList.items = updatedItems;
        updatedList.updatedAt = new Date().toISOString();
        
        // Recalcular summary
        updatedList.summary = this.calculateSummary(updatedList.items);
        
        return updatedList;
    }
    
    /**
     * Calcula o resumo da lista automaticamente
     * @param {Array} items - Array de itens da lista
     * @returns {Object} Summary calculado
     */
    static calculateSummary(items) {
        const summary = {
            totalItems: items.length,
            purchasedItems: items.filter(item => item.purchased).length,
            estimatedTotal: items.reduce((total, item) => {
                return total + (item.quantity * item.estimatedPrice);
            }, 0)
        };
        
        // Arredondar total para 2 casas decimais
        summary.estimatedTotal = Math.round(summary.estimatedTotal * 100) / 100;
        
        return summary;
    }
    
    /**
     * Valida campos obrigatórios da lista
     * @param {Object} listData - Dados da lista
     */
    static validateRequiredFields(listData) {
        if (!listData.name || typeof listData.name !== 'string' || listData.name.trim() === '') {
            throw new Error('Nome da lista é obrigatório');
        }
        
        if (listData.name.trim().length < 2) {
            throw new Error('Nome da lista deve ter pelo menos 2 caracteres');
        }
    }
    
    /**
     * Valida status da lista
     * @param {string} status - Status para validar
     */
    static validateStatus(status) {
        if (!this.VALID_STATUSES.includes(status)) {
            throw new Error(`Status inválido. Status válidos: ${this.VALID_STATUSES.join(', ')}`);
        }
    }
    
    /**
     * Valida dados do item da lista
     * @param {Object} itemData - Dados do item
     */
    static validateItemData(itemData) {
        if (!itemData.quantity || isNaN(parseFloat(itemData.quantity)) || parseFloat(itemData.quantity) <= 0) {
            throw new Error('Quantidade é obrigatória e deve ser um número maior que zero');
        }
        
        if (itemData.estimatedPrice !== undefined) {
            const price = parseFloat(itemData.estimatedPrice);
            if (isNaN(price) || price < 0) {
                throw new Error('Preço estimado deve ser um número maior ou igual a zero');
            }
        }
    }
    
    /**
     * Cria o schema de exemplo para documentação
     * @returns {Object} Schema de exemplo
     */
    static getSchemaExample() {
        return {
            id: "uuid",
            userId: "string",
            name: "string",
            description: "string",
            status: "active|completed|archived",
            items: [
                {
                    itemId: "string",
                    itemName: "string", // cache do nome
                    quantity: "number",
                    unit: "string",
                    estimatedPrice: "number",
                    purchased: "boolean",
                    notes: "string",
                    addedAt: "timestamp"
                }
            ],
            summary: {
                totalItems: "number",
                purchasedItems: "number",
                estimatedTotal: "number"
            },
            createdAt: "timestamp",
            updatedAt: "timestamp"
        };
    }
    
    /**
     * Valida se a lista atende ao schema
     * @param {Object} list - Lista para validar
     * @returns {boolean} True se válido
     */
    static validateSchema(list) {
        try {
            // Verificar campos obrigatórios
            const requiredFields = ['id', 'userId', 'name', 'status', 'items', 'summary', 'createdAt', 'updatedAt'];
            
            for (const field of requiredFields) {
                if (!(field in list)) {
                    throw new Error(`Campo obrigatório ausente: ${field}`);
                }
            }
            
            // Verificar tipos
            if (typeof list.name !== 'string') {
                throw new Error('name deve ser string');
            }
            
            if (typeof list.userId !== 'string') {
                throw new Error('userId deve ser string');
            }
            
            if (!Array.isArray(list.items)) {
                throw new Error('items deve ser array');
            }
            
            if (typeof list.summary !== 'object') {
                throw new Error('summary deve ser objeto');
            }
            
            // Verificar status válido
            this.validateStatus(list.status);
            
            // Verificar estrutura do summary
            const summaryFields = ['totalItems', 'purchasedItems', 'estimatedTotal'];
            for (const field of summaryFields) {
                if (!(field in list.summary) || typeof list.summary[field] !== 'number') {
                    throw new Error(`summary.${field} deve ser number`);
                }
            }
            
            // Verificar timestamps
            if (!Date.parse(list.createdAt) || !Date.parse(list.updatedAt)) {
                throw new Error('Timestamps inválidos');
            }
            
            return true;
        } catch (error) {
            console.error('Erro na validação do schema:', error.message);
            return false;
        }
    }
    
    /**
     * Filtra listas por critérios
     * @param {Array} lists - Array de listas
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Listas filtradas
     */
    static filterLists(lists, filters = {}) {
        let filteredLists = [...lists];
        
        // Filtrar por status
        if (filters.status) {
            filteredLists = filteredLists.filter(list => list.status === filters.status);
        }
        
        // Filtrar por nome (busca parcial)
        if (filters.name) {
            const searchTerm = filters.name.toLowerCase();
            filteredLists = filteredLists.filter(list => 
                list.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Filtrar por descrição
        if (filters.description) {
            const searchDesc = filters.description.toLowerCase();
            filteredLists = filteredLists.filter(list => 
                list.description && list.description.toLowerCase().includes(searchDesc)
            );
        }
        
        return filteredLists;
    }
    
    /**
     * Retorna estatísticas das listas do usuário
     * @param {Array} lists - Array de listas
     * @returns {Object} Estatísticas das listas
     */
    static getListStats(lists) {
        const stats = {
            total: lists.length,
            active: lists.filter(list => list.status === 'active').length,
            completed: lists.filter(list => list.status === 'completed').length,
            archived: lists.filter(list => list.status === 'archived').length,
            totalItems: lists.reduce((sum, list) => sum + list.summary.totalItems, 0),
            totalValue: lists.reduce((sum, list) => sum + list.summary.estimatedTotal, 0)
        };
        
        // Arredondar total
        stats.totalValue = Math.round(stats.totalValue * 100) / 100;
        
        return stats;
    }
}

module.exports = ListModel;