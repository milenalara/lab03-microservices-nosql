const { v4: uuidv4 } = require('uuid');

/**
 * Schema e modelo para o item conforme especificação do documento
 * Sistema de Lista de Compras - Item Service - PUC Minas
 */
class ItemModel {
    /**
     * Categorias válidas conforme especificação
     */
    static VALID_CATEGORIES = [
        'Alimentos',
        'Limpeza',
        'Higiene',
        'Bebidas',
        'Padaria'
    ];

    /**
     * Unidades válidas
     */
    static VALID_UNITS = [
        'kg',
        'un',
        'litro',
        'g',
        'ml',
        'pacote',
        'caixa',
        'lata',
        'garrafa'
    ];

    /**
     * Cria um novo item com o schema especificado
     * @param {Object} itemData - Dados do item
     * @returns {Object} Item formatado conforme schema
     */
    static createItem(itemData) {
        // Validar campos obrigatórios
        this.validateRequiredFields(itemData);
        
        // Validar categoria
        this.validateCategory(itemData.category);
        
        // Validar unidade
        this.validateUnit(itemData.unit);

        // Validar preço
        this.validatePrice(itemData.averagePrice);
        
        // Criar objeto conforme schema
        const item = {
            id: uuidv4(),
            name: itemData.name.trim(),
            category: itemData.category,
            brand: itemData.brand ? itemData.brand.trim() : "",
            unit: itemData.unit,
            averagePrice: parseFloat(itemData.averagePrice),
            barcode: itemData.barcode ? itemData.barcode.trim() : "",
            description: itemData.description ? itemData.description.trim() : "",
            active: itemData.active !== undefined ? Boolean(itemData.active) : true,
            createdAt: new Date().toISOString()
        };
        
        return item;
    }
    
    /**
     * Atualiza um item existente
     * @param {Object} existingItem - Item existente
     * @param {Object} updateData - Dados para atualização
     * @returns {Object} Item atualizado
     */
    static updateItem(existingItem, updateData) {
        const updatedItem = { ...existingItem };
        
        // Campos que podem ser atualizados
        if (updateData.name) {
            updatedItem.name = updateData.name.trim();
        }
        
        if (updateData.category) {
            this.validateCategory(updateData.category);
            updatedItem.category = updateData.category;
        }
        
        if (updateData.brand !== undefined) {
            updatedItem.brand = updateData.brand ? updateData.brand.trim() : "";
        }
        
        if (updateData.unit) {
            this.validateUnit(updateData.unit);
            updatedItem.unit = updateData.unit;
        }
        
        if (updateData.averagePrice !== undefined) {
            this.validatePrice(updateData.averagePrice);
            updatedItem.averagePrice = parseFloat(updateData.averagePrice);
        }
        
        if (updateData.barcode !== undefined) {
            updatedItem.barcode = updateData.barcode ? updateData.barcode.trim() : "";
        }
        
        if (updateData.description !== undefined) {
            updatedItem.description = updateData.description ? updateData.description.trim() : "";
        }
        
        if (updateData.active !== undefined) {
            updatedItem.active = Boolean(updateData.active);
        }
        
        return updatedItem;
    }
    
    /**
     * Valida campos obrigatórios
     * @param {Object} itemData - Dados do item
     */
    static validateRequiredFields(itemData) {
        const requiredFields = ['name', 'category', 'unit', 'averagePrice'];
        
        for (const field of requiredFields) {
            if (!itemData[field] || (typeof itemData[field] === 'string' && itemData[field].trim() === '')) {
                throw new Error(`Campo obrigatório: ${field}`);
            }
        }
        
        // Validar tamanhos mínimos
        if (itemData.name.trim().length < 2) {
            throw new Error('Nome deve ter pelo menos 2 caracteres');
        }
    }
    
    /**
     * Valida categoria
     * @param {string} category - Categoria para validar
     */
    static validateCategory(category) {
        if (!this.VALID_CATEGORIES.includes(category)) {
            throw new Error(`Categoria inválida. Categorias válidas: ${this.VALID_CATEGORIES.join(', ')}`);
        }
    }
    
    /**
     * Valida unidade
     * @param {string} unit - Unidade para validar
     */
    static validateUnit(unit) {
        if (!this.VALID_UNITS.includes(unit)) {
            throw new Error(`Unidade inválida. Unidades válidas: ${this.VALID_UNITS.join(', ')}`);
        }
    }
    
    /**
     * Valida preço
     * @param {number} price - Preço para validar
     */
    static validatePrice(price) {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice < 0) {
            throw new Error('Preço deve ser um número maior ou igual a zero');
        }
    }
    
    /**
     * Cria o schema de exemplo para documentação
     * @returns {Object} Schema de exemplo
     */
    static getSchemaExample() {
        return {
            id: "uuid",
            name: "string",
            category: "string",
            brand: "string",
            unit: "string", // "kg", "un", "litro"
            averagePrice: "number",
            barcode: "string",
            description: "string",
            active: "boolean",
            createdAt: "timestamp"
        };
    }
    
    /**
     * Valida se o item atende ao schema
     * @param {Object} item - Item para validar
     * @returns {boolean} True se válido
     */
    static validateSchema(item) {
        try {
            // Verificar campos obrigatórios
            const requiredFields = ['id', 'name', 'category', 'unit', 'averagePrice', 'active', 'createdAt'];
            
            for (const field of requiredFields) {
                if (!(field in item)) {
                    throw new Error(`Campo obrigatório ausente: ${field}`);
                }
            }
            
            // Verificar tipos
            if (typeof item.name !== 'string') {
                throw new Error('name deve ser string');
            }
            
            if (typeof item.category !== 'string') {
                throw new Error('category deve ser string');
            }
            
            if (typeof item.unit !== 'string') {
                throw new Error('unit deve ser string');
            }
            
            if (typeof item.averagePrice !== 'number') {
                throw new Error('averagePrice deve ser number');
            }
            
            if (typeof item.active !== 'boolean') {
                throw new Error('active deve ser boolean');
            }
            
            // Verificar timestamp
            if (!Date.parse(item.createdAt)) {
                throw new Error('createdAt deve ser um timestamp válido');
            }
            
            // Verificar categoria válida
            this.validateCategory(item.category);
            
            // Verificar unidade válida
            this.validateUnit(item.unit);
            
            return true;
        } catch (error) {
            console.error('Erro na validação do schema:', error.message);
            return false;
        }
    }
    
    /**
     * Retorna estatísticas das categorias
     * @param {Array} items - Array de itens
     * @returns {Object} Estatísticas por categoria
     */
    static getCategoryStats(items) {
        const stats = {};
        
        this.VALID_CATEGORIES.forEach(category => {
            stats[category] = {
                total: 0,
                active: 0,
                averagePrice: 0
            };
        });
        
        items.forEach(item => {
            if (stats[item.category]) {
                stats[item.category].total++;
                if (item.active) {
                    stats[item.category].active++;
                }
            }
        });
        
        // Calcular preço médio por categoria
        this.VALID_CATEGORIES.forEach(category => {
            const categoryItems = items.filter(item => item.category === category && item.active);
            if (categoryItems.length > 0) {
                const totalPrice = categoryItems.reduce((sum, item) => sum + item.averagePrice, 0);
                stats[category].averagePrice = totalPrice / categoryItems.length;
            }
        });
        
        return stats;
    }
    
    /**
     * Filtra itens por critérios
     * @param {Array} items - Array de itens
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Itens filtrados
     */
    static filterItems(items, filters = {}) {
        let filteredItems = [...items];
        
        // Filtrar por categoria
        if (filters.category) {
            filteredItems = filteredItems.filter(item => item.category === filters.category);
        }
        
        // Filtrar por nome (busca parcial)
        if (filters.name) {
            const searchTerm = filters.name.toLowerCase();
            filteredItems = filteredItems.filter(item => 
                item.name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Filtrar por marca
        if (filters.brand) {
            const searchBrand = filters.brand.toLowerCase();
            filteredItems = filteredItems.filter(item => 
                item.brand.toLowerCase().includes(searchBrand)
            );
        }
        
        // Filtrar por status ativo
        if (filters.active !== undefined) {
            filteredItems = filteredItems.filter(item => item.active === Boolean(filters.active));
        }
        
        // Filtrar por faixa de preço
        if (filters.minPrice !== undefined) {
            filteredItems = filteredItems.filter(item => item.averagePrice >= parseFloat(filters.minPrice));
        }
        
        if (filters.maxPrice !== undefined) {
            filteredItems = filteredItems.filter(item => item.averagePrice <= parseFloat(filters.maxPrice));
        }
        
        return filteredItems;
    }
}

module.exports = ItemModel;