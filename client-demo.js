const axios = require('axios');

/**
 * Cliente de demonstração para o Sistema de Lista de Compras
 * Sistema de Microsserviços - PUC Minas
 * 
 * Este cliente demonstra o fluxo completo do sistema:
 * 1. Registro de usuário
 * 2. Login
 * 3. Busca de itens
 * 4. Criação de lista
 * 5. Adição de itens à lista
 * 6. Visualização do dashboard
 */

class ShoppingListDemo {
    constructor() {
        this.baseUrl = 'http://localhost:3000'; // API Gateway
        this.token = null;
        this.userId = null;
        this.createdListId = null;
        
        // Configurar timeout padrão
        axios.defaults.timeout = 10000;
        
        console.log('🛒 Sistema de Lista de Compras - Demo Client');
        console.log('📡 URL Base:', this.baseUrl);
        console.log('=====================================\n');
    }

    /**
     * Aguardar um tempo para simular interação do usuário
     */
    async wait(ms = 2000) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Fazer requisição HTTP com tratamento de erro
     */
    async makeRequest(method, endpoint, data = null, headers = {}) {
        try {
            const config = {
                method,
                url: `${this.baseUrl}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`❌ Erro na requisição ${method} ${endpoint}:`);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Erro: ${JSON.stringify(error.response.data, null, 2)}`);
            } else {
                console.error(`   Erro: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * 1. Registro de usuário
     */
    async registerUser() {
        console.log('👤 PASSO 1: Registrando novo usuário...');
        
        const userData = {
            email: 'demo@example.com',
            username: 'demo_user',
            password: 'demo123456',
            firstName: 'Demo',
            lastName: 'User',
            preferences: {
                defaultStore: 'Supermercado Central',
                currency: 'BRL'
            }
        };

        try {
            const result = await this.makeRequest('POST', '/api/auth/register', userData);
            console.log('✅ Usuário registrado com sucesso!');
            console.log(`   ID: ${result.user.id}`);
            console.log(`   Email: ${result.user.email}`);
            console.log(`   Nome: ${result.user.firstName} ${result.user.lastName}`);
            
            this.userId = result.user.id;
            
            if (result.token) {
                this.token = result.token;
                console.log('🔑 Token JWT recebido automaticamente');
            }
            
            return result;
        } catch (error) {
            if (error.response && error.response.status === 400 && 
                error.response.data.message && error.response.data.message.includes('já existe')) {
                console.log('ℹ️  Usuário já existe, continuando com login...');
                return null;
            }
            throw error;
        }
    }

    /**
     * 2. Login do usuário
     */
    async loginUser() {
        console.log('\n🔐 PASSO 2: Fazendo login...');
        
        const loginData = {
            email: 'demo@example.com',
            password: 'demo123456'
        };

        try {
            const result = await this.makeRequest('POST', '/api/auth/login', loginData);
            console.log('✅ Login realizado com sucesso!');
            console.log(`   Usuário: ${result.user.username}`);
            console.log(`   Nome: ${result.user.firstName} ${result.user.lastName}`);
            
            this.token = result.token;
            this.userId = result.user.id;
            
            console.log('🔑 Token JWT obtido para autenticação');
            return result;
        } catch (error) {
            console.error('❌ Falha no login');
            throw error;
        }
    }

    /**
     * 3. Busca de itens no catálogo
     */
    async searchItems() {
        console.log('\n🔍 PASSO 3: Buscando itens no catálogo...');
        
        try {
            // Buscar todos os itens
            const allItems = await this.makeRequest('GET', '/api/items');
            console.log(`✅ Encontrados ${allItems.items.length} itens no catálogo`);
            
            // Buscar por categoria
            const foodItems = await this.makeRequest('GET', '/api/items?category=Alimentos');
            console.log(`   📦 ${foodItems.items.length} itens na categoria Alimentos`);
            
            // Buscar categorias disponíveis
            const categories = await this.makeRequest('GET', '/api/categories');
            console.log(`   🏷️  Categorias disponíveis: ${categories.categories.join(', ')}`);
            
            // Busca por termo
            const searchResults = await this.makeRequest('GET', '/api/search/items?q=arroz');
            console.log(`   🔎 Busca por "arroz": ${searchResults.results.length} resultados`);
            
            // Mostrar alguns itens encontrados
            console.log('\n   📋 Primeiros itens encontrados:');
            allItems.items.slice(0, 5).forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.name} - ${item.category} - R$ ${item.averagePrice}`);
            });
            
            return allItems.items;
        } catch (error) {
            console.error('❌ Falha na busca de itens');
            throw error;
        }
    }

    /**
     * 4. Criação de lista de compras
     */
    async createShoppingList() {
        console.log('\n📝 PASSO 4: Criando lista de compras...');
        
        const listData = {
            name: 'Lista de Compras - Demo',
            description: 'Lista criada pelo cliente de demonstração',
            status: 'active'
        };

        try {
            const headers = {
                'Authorization': `Bearer ${this.token}`
            };

            const result = await this.makeRequest('POST', '/api/lists', listData, headers);
            console.log('✅ Lista criada com sucesso!');
            console.log(`   ID: ${result.list.id}`);
            console.log(`   Nome: ${result.list.name}`);
            console.log(`   Descrição: ${result.list.description}`);
            console.log(`   Status: ${result.list.status}`);
            
            this.createdListId = result.list.id;
            return result.list;
        } catch (error) {
            console.error('❌ Falha na criação da lista');
            throw error;
        }
    }

    /**
     * 5. Adição de itens à lista
     */
    async addItemsToList() {
        console.log('\n➕ PASSO 5: Adicionando itens à lista...');
        
        if (!this.createdListId) {
            throw new Error('Lista não foi criada ainda');
        }

        // Primeiro, buscar alguns itens para adicionar
        const items = await this.makeRequest('GET', '/api/items?limit=10');
        
        const headers = {
            'Authorization': `Bearer ${this.token}`
        };

        try {
            // Adicionar primeiro item
            const item1 = items.items[0];
            const addItem1 = {
                itemId: item1.id,
                quantity: 2,
                estimatedPrice: item1.averagePrice,
                notes: 'Item adicionado via demo'
            };

            const result1 = await this.makeRequest('POST', `/api/lists/${this.createdListId}/items`, addItem1, headers);
            console.log(`✅ Item adicionado: ${item1.name} (Qtd: ${addItem1.quantity})`);

            // Adicionar segundo item
            if (items.items.length > 1) {
                const item2 = items.items[1];
                const addItem2 = {
                    itemId: item2.id,
                    quantity: 1,
                    estimatedPrice: item2.averagePrice,
                    notes: 'Segundo item da demo'
                };

                const result2 = await this.makeRequest('POST', `/api/lists/${this.createdListId}/items`, addItem2, headers);
                console.log(`✅ Item adicionado: ${item2.name} (Qtd: ${addItem2.quantity})`);
            }

            // Adicionar terceiro item
            if (items.items.length > 2) {
                const item3 = items.items[2];
                const addItem3 = {
                    itemId: item3.id,
                    quantity: 3,
                    estimatedPrice: item3.averagePrice,
                    purchased: false
                };

                const result3 = await this.makeRequest('POST', `/api/lists/${this.createdListId}/items`, addItem3, headers);
                console.log(`✅ Item adicionado: ${item3.name} (Qtd: ${addItem3.quantity})`);
            }

            // Buscar lista atualizada
            const updatedList = await this.makeRequest('GET', `/api/lists/${this.createdListId}`, null, headers);
            console.log(`\n   📊 Resumo da lista:`);
            console.log(`   Total de itens: ${updatedList.list.summary.totalItems}`);
            console.log(`   Valor estimado: R$ ${updatedList.list.summary.estimatedTotal.toFixed(2)}`);
            
            return updatedList.list;
        } catch (error) {
            console.error('❌ Falha ao adicionar itens à lista');
            throw error;
        }
    }

    /**
     * 6. Visualização do dashboard
     */
    async viewDashboard() {
        console.log('\n📊 PASSO 6: Visualizando dashboard...');
        
        const headers = {
            'Authorization': `Bearer ${this.token}`
        };

        try {
            const dashboard = await this.makeRequest('GET', '/api/dashboard', null, headers);
            
            console.log('✅ Dashboard carregado com sucesso!');
            console.log('\n   🏗️  Arquitetura do Sistema:');
            console.log(`   Domain: ${dashboard.data.domain}`);
            console.log(`   Architecture: ${dashboard.data.architecture}`);
            console.log(`   Database Approach: ${dashboard.data.database_approach}`);
            
            console.log('\n   🔧 Status dos Serviços:');
            Object.entries(dashboard.data.services_status).forEach(([name, service]) => {
                const status = service.healthy ? '✅ Healthy' : '❌ Unhealthy';
                console.log(`   ${name}: ${status} (${service.url})`);
            });
            
            if (dashboard.data.user_data && dashboard.data.user_data.profile && dashboard.data.user_data.profile.available) {
                console.log('\n   👤 Dados do Usuário: ✅ Disponível');
            }
            
            if (dashboard.data.shopping_data) {
                console.log('\n   🛒 Dados de Compras:');
                
                if (dashboard.data.shopping_data.lists && dashboard.data.shopping_data.lists.available) {
                    console.log('   📝 Listas: ✅ Disponível');
                }
                
                if (dashboard.data.shopping_data.items && dashboard.data.shopping_data.items.available) {
                    console.log('   📦 Itens: ✅ Disponível');
                }
                
                if (dashboard.data.shopping_data.categories && dashboard.data.shopping_data.categories.available) {
                    console.log('   🏷️  Categorias: ✅ Disponível');
                }
            }
            
            return dashboard.data;
        } catch (error) {
            console.error('❌ Falha ao carregar dashboard');
            throw error;
        }
    }

    /**
     * Demonstração adicional: busca global
     */
    async globalSearch() {
        console.log('\n🌐 DEMONSTRAÇÃO EXTRA: Busca Global...');
        
        const headers = {
            'Authorization': `Bearer ${this.token}`
        };

        try {
            const searchResults = await this.makeRequest('GET', '/api/search?q=arroz', null, headers);
            
            console.log('✅ Busca global realizada');
            console.log(`   🔍 Termo buscado: "arroz"`);
            
            if (searchResults.data.items) {
                console.log(`   📦 Itens encontrados: ${searchResults.data.items.results.length}`);
            }
            
            if (searchResults.data.lists) {
                console.log(`   📝 Listas encontradas: ${searchResults.data.lists.results.length}`);
            }
            
            return searchResults.data;
        } catch (error) {
            console.error('❌ Falha na busca global');
            throw error;
        }
    }

    /**
     * Verificar health dos serviços
     */
    async checkHealth() {
        console.log('\n💊 VERIFICAÇÃO DE SAÚDE: Health Checks...');
        
        try {
            const health = await this.makeRequest('GET', '/health');
            
            console.log('✅ Health check realizado');
            console.log(`   🏗️  Arquitetura: ${health.architecture}`);
            console.log(`   📊 Total de serviços: ${health.serviceCount}`);
            
            if (health.services) {
                console.log('\n   📋 Status dos serviços:');
                Object.entries(health.services).forEach(([name, service]) => {
                    const status = service.healthy ? '✅' : '❌';
                    console.log(`   ${status} ${name} (${service.url})`);
                });
            }
            
            return health;
        } catch (error) {
            console.error('❌ Falha no health check');
            throw error;
        }
    }

    /**
     * Executar demonstração completa
     */
    async runDemo() {
        try {
            console.log('🚀 Iniciando demonstração do Sistema de Lista de Compras\n');
            
            // Verificar se os serviços estão funcionando
            await this.checkHealth();
            await this.wait(1500);
            
            // 1. Registro de usuário
            await this.registerUser();
            await this.wait(1500);
            
            // 2. Login (se registro falhou por usuário existir)
            if (!this.token) {
                await this.loginUser();
                await this.wait(1500);
            }
            
            // 3. Busca de itens
            const items = await this.searchItems();
            await this.wait(1500);
            
            // 4. Criação de lista
            await this.createShoppingList();
            await this.wait(1500);
            
            // 5. Adição de itens à lista
            await this.addItemsToList();
            await this.wait(1500);
            
            // 6. Visualização do dashboard
            await this.viewDashboard();
            await this.wait(1500);
            
            // Demonstração extra
            await this.globalSearch();
            
            console.log('\n🎉 DEMONSTRAÇÃO CONCLUÍDA COM SUCESSO!');
            console.log('=====================================');
            console.log('✅ Todos os cenários foram testados:');
            console.log('   1. ✅ Registro de usuário');
            console.log('   2. ✅ Login');
            console.log('   3. ✅ Busca de itens');
            console.log('   4. ✅ Criação de lista');
            console.log('   5. ✅ Adição de itens à lista');
            console.log('   6. ✅ Visualização do dashboard');
            console.log('   + ✅ Busca global');
            console.log('   + ✅ Health checks');
            console.log('\n🏆 Sistema de microsserviços funcionando perfeitamente!');
            
        } catch (error) {
            console.error('\n💥 FALHA NA DEMONSTRAÇÃO!');
            console.error('=====================================');
            console.error('❌ Erro encontrado:', error.message);
            console.error('\n🔧 Verifique se todos os serviços estão rodando:');
            console.error('   • User Service (porta 3001)');
            console.error('   • List Service (porta 3002)');
            console.error('   • Item Service (porta 3003)');
            console.error('   • API Gateway (porta 3000)');
            console.error('\n📋 Para iniciar todos os serviços:');
            console.error('   npm run start');
            
            process.exit(1);
        }
    }
}

// Verificar se está sendo executado diretamente
if (require.main === module) {
    const demo = new ShoppingListDemo();
    demo.runDemo();
}

module.exports = ShoppingListDemo;