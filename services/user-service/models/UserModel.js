const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * Schema e modelo para o usuário conforme especificação do documento
 * Sistema de Lista de Compras - PUC Minas
 */
class UserModel {
    /**
     * Cria um novo usuário com o schema especificado
     * @param {Object} userData - Dados do usuário
     * @returns {Object} Usuário formatado conforme schema
     */
    static async createUser(userData) {
        // Validar campos obrigatórios
        this.validateRequiredFields(userData);
        
        // Validar formato do email
        this.validateEmail(userData.email);
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        // Criar objeto conforme schema
        const user = {
            id: uuidv4(),
            email: userData.email.toLowerCase().trim(),
            username: userData.username.trim(),
            password: hashedPassword,
            firstName: userData.firstName.trim(),
            lastName: userData.lastName.trim(),
            preferences: {
                defaultStore: userData.preferences?.defaultStore || "",
                currency: userData.preferences?.currency || "BRL"
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return user;
    }
    
    /**
     * Atualiza um usuário existente
     * @param {Object} existingUser - Usuário existente
     * @param {Object} updateData - Dados para atualização
     * @returns {Object} Usuário atualizado
     */
    static async updateUser(existingUser, updateData) {
        const updatedUser = { ...existingUser };
        
        // Campos que podem ser atualizados
        if (updateData.email) {
            this.validateEmail(updateData.email);
            updatedUser.email = updateData.email.toLowerCase().trim();
        }
        
        if (updateData.username) {
            updatedUser.username = updateData.username.trim();
        }
        
        if (updateData.firstName) {
            updatedUser.firstName = updateData.firstName.trim();
        }
        
        if (updateData.lastName) {
            updatedUser.lastName = updateData.lastName.trim();
        }
        
        // Atualizar senha se fornecida
        if (updateData.password) {
            updatedUser.password = await bcrypt.hash(updateData.password, 12);
        }
        
        // Atualizar preferências
        if (updateData.preferences) {
            updatedUser.preferences = {
                ...updatedUser.preferences,
                ...updateData.preferences
            };
        }
        
        // Atualizar timestamp
        updatedUser.updatedAt = new Date().toISOString();
        
        return updatedUser;
    }
    
    /**
     * Remove dados sensíveis do usuário para resposta
     * @param {Object} user - Usuário completo
     * @returns {Object} Usuário sem dados sensíveis
     */
    static toSafeUser(user) {
        const { password, ...safeUser } = user;
        return safeUser;
    }
    
    /**
     * Valida campos obrigatórios
     * @param {Object} userData - Dados do usuário
     */
    static validateRequiredFields(userData) {
        const requiredFields = ['email', 'username', 'password', 'firstName', 'lastName'];
        
        for (const field of requiredFields) {
            if (!userData[field] || typeof userData[field] !== 'string' || userData[field].trim() === '') {
                throw new Error(`Campo obrigatório: ${field}`);
            }
        }
        
        // Validar tamanhos mínimos
        if (userData.username.trim().length < 3) {
            throw new Error('Username deve ter pelo menos 3 caracteres');
        }
        
        if (userData.password.length < 6) {
            throw new Error('Password deve ter pelo menos 6 caracteres');
        }
        
        if (userData.firstName.trim().length < 2) {
            throw new Error('Nome deve ter pelo menos 2 caracteres');
        }
        
        if (userData.lastName.trim().length < 2) {
            throw new Error('Sobrenome deve ter pelo menos 2 caracteres');
        }
    }
    
    /**
     * Valida formato do email
     * @param {string} email - Email para validar
     */
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Formato de email inválido');
        }
    }
    
    /**
     * Verifica se a senha está correta
     * @param {string} plainPassword - Senha em texto plano
     * @param {string} hashedPassword - Senha com hash
     * @returns {boolean} True se a senha estiver correta
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
    
    /**
     * Cria o schema de exemplo para documentação
     * @returns {Object} Schema de exemplo
     */
    static getSchemaExample() {
        return {
            id: "uuid",
            email: "string",
            username: "string", 
            password: "string (hash)",
            firstName: "string",
            lastName: "string",
            preferences: {
                defaultStore: "string",
                currency: "string"
            },
            createdAt: "timestamp",
            updatedAt: "timestamp"
        };
    }
    
    /**
     * Valida se o usuário atende ao schema
     * @param {Object} user - Usuário para validar
     * @returns {boolean} True se válido
     */
    static validateSchema(user) {
        try {
            // Verificar campos obrigatórios
            const requiredFields = ['id', 'email', 'username', 'password', 'firstName', 'lastName', 'preferences', 'createdAt', 'updatedAt'];
            
            for (const field of requiredFields) {
                if (!(field in user)) {
                    throw new Error(`Campo obrigatório ausente: ${field}`);
                }
            }
            
            // Verificar estrutura de preferences
            if (!user.preferences || typeof user.preferences !== 'object') {
                throw new Error('preferences deve ser um objeto');
            }
            
            if (!('defaultStore' in user.preferences) || !('currency' in user.preferences)) {
                throw new Error('preferences deve conter defaultStore e currency');
            }
            
            // Verificar timestamps
            if (!Date.parse(user.createdAt) || !Date.parse(user.updatedAt)) {
                throw new Error('Timestamps inválidos');
            }
            
            return true;
        } catch (error) {
            console.error('Erro na validação do schema:', error.message);
            return false;
        }
    }
}

module.exports = UserModel;