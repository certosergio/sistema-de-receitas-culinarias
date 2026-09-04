migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const categoriesCol = app.findCollectionByNameOrId('categories')
    const techniquesCol = app.findCollectionByNameOrId('techniques')
    const recipesCol = app.findCollectionByNameOrId('recipes')
    const collectionsCol = app.findCollectionByNameOrId('collections')
    const collectionRecipesCol = app.findCollectionByNameOrId('collection_recipes')
    const selectedRecipesCol = app.findCollectionByNameOrId('selected_recipes')

    // 1. Seed or get User
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'certosergio@gmail.com')
    } catch (_) {
      userRecord = new Record(usersCol)
      userRecord.setEmail('certosergio@gmail.com')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Sérgio')
      app.save(userRecord)
    }

    // 2. Categories
    const categoriesData = [
      {
        name: 'Pães & Fermentados',
        slug: 'paes-fermentados',
        description: 'Pães artesanais, focaccias, brioches e massas fermentadas.',
        color: '#B98A4F',
      },
      {
        name: 'Massas',
        slug: 'massas',
        description: 'Massas frescas, secas, recheadas, risotos e molhos clássicos.',
        color: '#C29A3B',
      },
      {
        name: 'Carnes',
        slug: 'carnes',
        description: 'Cortes bovinos, suínos, aves e preparos de caça.',
        color: '#B4553F',
      },
      {
        name: 'Vegetariano',
        slug: 'vegetariano',
        description: 'Pratos à base de legumes, grãos, cogumelos e queijos artesanais.',
        color: '#4C7A5B',
      },
      {
        name: 'Sobremesas',
        slug: 'sobremesas',
        description: 'Confeitaria fina, tortas, doces e sobremesas clássicas.',
        color: '#8E5A78',
      },
      {
        name: 'Entradas',
        slug: 'entradas',
        description: 'Pequenos pratos, canapés, bruschettas e antepastos.',
        color: '#5A7D8E',
      },
      {
        name: 'Saladas',
        slug: 'saladas',
        description: 'Saladas compostas, folhas frescas e vinagretes aromáticos.',
        color: '#3B7A57',
      },
      {
        name: 'Molhos & Conservas',
        slug: 'molhos-conservas',
        description: 'Fundos, reduções, emulsões, picles e compotas.',
        color: '#8C6D4F',
      },
      { name: 'Peixes', slug: 'peixes', description: '', color: '#B98A4F' },
      { name: 'Lanches', slug: 'lanches', description: '', color: '#B98A4F' },
    ]

    const categoryMap = {}
    for (const cat of categoriesData) {
      try {
        const existing = app.findFirstRecordByData('categories', 'slug', cat.slug)
        categoryMap[cat.slug] = existing.id
      } catch (_) {
        const record = new Record(categoriesCol)
        record.set('name', cat.name)
        record.set('slug', cat.slug)
        record.set('description', cat.description)
        record.set('color', cat.color)
        app.save(record)
        categoryMap[cat.slug] = record.id
      }
    }

    // 3. Techniques
    const techniquesData = [
      {
        name: 'Grelhado',
        slug: 'grelhado',
        description: 'Cozimento rápido sob calor direto intenso, criando crosta caramelizada.',
      },
      {
        name: 'Forno',
        slug: 'assado',
        description: 'Cozimento lento ou médio em forno por calor seco e indireto.',
      },
      {
        name: 'Cozido',
        slug: 'cozido',
        description: 'Preparo em meio líquido com temperatura branda e infusão de aromas.',
      },
      {
        name: 'Refogado',
        slug: 'refogado',
        description: 'Salteado em gordura aromatizada com cebola, alho e ervas.',
      },
      {
        name: 'Fritura profunda',
        slug: 'fritura-profunda',
        description: 'Imersão em óleo quente para textura externa crocante e interior macio.',
      },
      {
        name: 'Sous-vide',
        slug: 'sous-vide',
        description: 'Cozimento a vácuo em banho-maria de temperatura precisamente controlada.',
      },
      {
        name: 'Defumado',
        slug: 'defumado',
        description: 'Exposição a fumaça de madeiras nobres para sabor e preservação.',
      },
      {
        name: 'Fermentação',
        slug: 'fermentacao',
        description: 'Transformação biológica natural por leveduras e bactérias benéficas.',
      },
      {
        name: 'Tecnica livre',
        slug: 'tecnica-livre',
        description: 'Preparo sem nenhuma tecnica especifica, apenas misturar os ingredientes',
      },
      {
        name: 'Banho maria',
        slug: 'banho-maria',
        description: 'Cozimento lento em em baixa temperatura',
      },
      { name: 'Cru', slug: 'cru', description: '' },
    ]

    const techniqueMap = {}
    for (const tech of techniquesData) {
      try {
        const existing = app.findFirstRecordByData('techniques', 'slug', tech.slug)
        techniqueMap[tech.slug] = existing.id
      } catch (_) {
        const record = new Record(techniquesCol)
        record.set('name', tech.name)
        record.set('slug', tech.slug)
        record.set('description', tech.description)
        app.save(record)
        techniqueMap[tech.slug] = record.id
      }
    }

    // 4. Recipes (16 full recipes)
    const recipesData = [
      {
        title: 'Moqueca Tradicional de Peixe e Camarão',
        slug: 'moqueca-tradicional-de-peixe-e-camarao',
        summary:
          'Receita costeira rica em leite de coco artesanal, azeite de dendê, robalho fresco e pimentões coloridos cozidos em panela de barro.',
        categorySlug: 'carnes',
        techniqueSlug: 'cozido',
        difficulty: 'Fácil',
        yield_quantity: 6,
        yield_unit: 'porções',
        portions: '1 tigela individual com caldo e guarnições',
        prep_minutes: 30,
        cook_minutes: 30,
        total_minutes: 60,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: false,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: 'Não mexa com colher durante o cozimento; apenas balance suavemente a panela pelas alças para integrar os sabores sem quebrar as postas.',
        ingredients: [
          { name: 'Postas de Robalo ou Badejo fresco', quantity: '1', unit: 'kg' },
          { name: 'Camarões médios limpos', quantity: '400', unit: 'g' },
          { name: 'Leite de coco artesanal espesso', quantity: '400', unit: 'ml' },
          { name: 'Azeite de dendê legítimo', quantity: '4', unit: 'colheres de sopa' },
          { name: 'Pimentão vermelho e amarelo fatiados', quantity: '2', unit: 'unidades' },
          { name: 'Cebolas brancas em rodelas', quantity: '2', unit: 'unidades' },
          { name: 'Tomates maduros fatiados', quantity: '3', unit: 'unidades' },
          { name: 'Coentro fresco e cebolinha picados', quantity: '1', unit: 'maço' },
        ],
        method: [
          'Marine as postas de peixe e os camarões com suco de limão, alho, sal e pimenta por 20 minutos.',
          'Na panela de barro aquecida, monte camadas com cebola, pimentões, tomates e postas de peixe temperadas.',
          'Regue com o leite de coco e o azeite de dendê. Tampe e cozinhe em fogo médio por cerca de 20 minutos.',
          'Adicione os camarões nos últimos 5 minutos de cozimento para manter a suculência e textura perfeita.',
          'Finalize com bastante coentro fresco picado e sirva com arroz branco e pirão feito com o caldo da moqueca.',
        ],
      },
      {
        title: 'Risoto de Cogumelos Porcini e Trufas',
        slug: 'risoto-de-cogumelos-porcini-e-trufas',
        summary:
          'Clássico italiano com arroz carnaroli, mix de cogumelos frescos e porcini hidratados, finalizado com manteiga gelada e parmesão.',
        categorySlug: 'massas',
        techniqueSlug: 'refogado',
        difficulty: 'Médio',
        yield_quantity: 4,
        yield_unit: 'porções',
        portions: '1 prato fundo generoso (cerca de 280g)',
        prep_minutes: 20,
        cook_minutes: 25,
        total_minutes: 45,
        cost: 48,
        calories: 420,
        protein: 11.5,
        carbs: 58,
        fat: 14.2,
        contains_gluten: false,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: 'A manteiga deve estar obrigatoriamente gelada no momento da mantecatura para criar uma emulsão perfeita com o amido do arroz.',
        ingredients: [
          { name: 'Arroz Carnaroli ou Arbóreo', quantity: '320', unit: 'g' },
          { name: 'Cogumelos Porcini secos', quantity: '30', unit: 'g' },
          { name: 'Cogumelos Paris e Shimeji frescos fatiados', quantity: '250', unit: 'g' },
          { name: 'Caldo de legumes caseiro fervente', quantity: '1.2', unit: 'L' },
          { name: 'Vinho branco seco de boa qualidade', quantity: '120', unit: 'ml' },
          { name: 'Queijo Parmigiano Reggiano ralado na hora', quantity: '80', unit: 'g' },
          { name: 'Manteiga sem sal bem gelada em cubos', quantity: '60', unit: 'g' },
          { name: 'Cebola chalota picada finamente', quantity: '1', unit: 'unidade' },
        ],
        method: [
          'Hidrate o Porcini em 200ml de água morna por 20 minutos. Coe a água e adicione-a à panela com o caldo de legumes aquecido.',
          'Em uma frigideira ampla, salteie os cogumelos frescos e o porcini no azeite com alho até dourarem; reserve.',
          'Na caçarola de risoto, doure a chalota no azeite, junte o arroz carnaroli e toste os grãos por 2 minutos (tostatura).',
          'Deglaceie com vinho branco seco e mexa até evaporar completamente o álcool.',
          'Acrescente conchas de caldo fervente aos poucos, mexendo sem parar, cozinhando por cerca de 16 minutos até ficar al dente.',
          'Retire do fogo, incorpore os cogumelos salteados, a manteiga gelada em cubos e o parmesão, batendo vigorosamente (mantecatura) para criar cremosidade perfeita.',
        ],
      },
      {
        title: 'Pão de Fermentação Natural (Sourdough)',
        slug: 'pao-de-fermentacao-natural',
        summary:
          'Pão rústico de casca crocante, miolo alvéolo aberto e aroma fermentado complexo feito com levain ativo.',
        categorySlug: 'paes-fermentados',
        techniqueSlug: 'fermentacao',
        difficulty: 'Médio',
        yield_quantity: 1,
        yield_unit: 'unidades',
        portions: '1 pão de 850g (cerca de 12 fatias)',
        prep_minutes: 40,
        cook_minutes: 45,
        total_minutes: 85,
        cost: 14.5,
        calories: 180,
        protein: 6.2,
        carbs: 36.5,
        fat: 0.8,
        contains_gluten: false,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: 'Use água sem cloro para não inibir as leveduras selvagens. Espere o pão esfriar por pelo menos 2 horas antes de cortar para assentar a umidade do miolo.',
        ingredients: [
          { name: 'Farinha de trigo especial (tipo 1 ou Manitoba)', quantity: '450', unit: 'g' },
          { name: 'Farinha de trigo integral fina', quantity: '50', unit: 'g' },
          { name: 'Água mineral fria (75% hidratação)', quantity: '375', unit: 'ml' },
          { name: 'Levain ativo (fermento natural refrescado)', quantity: '100', unit: 'g' },
          { name: 'Sal marinho refinado', quantity: '10', unit: 'g' },
        ],
        method: [
          'Faça a autólise misturando as farinhas e 350ml de água até incorporar. Cubra e descanse por 45 minutos.',
          'Adicione o fermento natural (levain) ativo e sove delicadamente até incorporar por completo.',
          'Dissolva o sal nos 25ml restantes de água e adicione à massa, trabalhando até obter elasticidade.',
          'Realize 4 séries de dobras (stretch and fold) a cada 30 minutos durante a primeira fermentação em temperatura ambiente.',
          'Modele a massa (batard ou boule) e transfira para um banneton enfarinhado com farinha de arroz.',
          'Fermente a frio na geladeira (4°C a 6°C) por 12 a 16 horas para desenvolver complexidade aromática.',
          'Asse em panela de ferro pré-aquecida a 250°C: 20 minutos com tampa, e mais 25 minutos a 210°C destampado até dourar profundamente.',
        ],
      },
      {
        title: 'Bolo Fondant de Chocolate Amargo 70%',
        slug: 'bolo-fondant-de-chocolate-amargo',
        summary:
          'Sobremesa francesa aveludada com chocolate de origem, textura densa e cremosa no centro, servida morna.',
        categorySlug: 'sobremesas',
        techniqueSlug: 'assado',
        difficulty: 'Fácil',
        yield_quantity: 8,
        yield_unit: 'fatias',
        portions: '1 fatia média de 100g',
        prep_minutes: 20,
        cook_minutes: 22,
        total_minutes: 42,
        cost: 26,
        calories: 340,
        protein: 5.8,
        carbs: 29.4,
        fat: 21.6,
        contains_gluten: true,
        contains_dairy: false,
        contains_eggs: true,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: 'Não asse em excesso para manter o coração aveludado e cremoso. Cada forno varia, verifique o centro aos 18 minutos.',
        ingredients: [
          { name: 'Chocolate meio amargo 70% cacau picado', quantity: '200', unit: 'g' },
          { name: 'Manteiga sem sal em cubos', quantity: '150', unit: 'g' },
          {
            name: 'Ovos caipiras inteiros em temperatura ambiente',
            quantity: '4',
            unit: 'unidades',
          },
          { name: 'Açúcar demerara ou cristal', quantity: '120', unit: 'g' },
          { name: 'Farinha de trigo peneirada', quantity: '50', unit: 'g' },
          { name: 'Extrato de baunilha pura', quantity: '1', unit: 'colher de chá' },
          { name: 'Flor de sal', quantity: '1', unit: 'pitada' },
        ],
        method: [
          'Derreta o chocolate picado e a manteiga em banho-maria suave ou micro-ondas em potência média, mexendo até ficar homogêneo e brilhante.',
          'Em uma tigela grande, bata os ovos com o açúcar e o extrato de baunilha até clarear e dobrar de volume.',
          'Incorpore a mistura de chocolate derretido aos ovos delicadamente com uma espátula de silicone.',
          'Peneire a farinha de trigo e a pitada de flor de sal sobre a massa, misturando apenas até homogeneizar.',
          'Despeje em fôrma redonda (20cm) untada e enfarinhada com cacau em pó.',
          'Asse em forno pré-aquecido a 180°C por cerca de 20 a 22 minutos — as bordas devem estar firmes e o centro ainda levemente trêmulo.',
        ],
      },
      {
        title: 'Galeto Grelhado com Ervas da Provence e Manteiga de Alho',
        slug: 'galeto-grelhado-com-ervas',
        summary:
          'Galeto desossado marinado em vinho branco, alecrim, tomilho e raspas de limão siciliano, grelhado com crosta dourada perfeita.',
        categorySlug: 'carnes',
        techniqueSlug: 'grelhado',
        difficulty: 'Fácil',
        yield_quantity: 4,
        yield_unit: 'porções',
        portions: 'Meio galeto por pessoa',
        prep_minutes: 25,
        cook_minutes: 25,
        total_minutes: 50,
        cost: 32.5,
        calories: 450,
        protein: 42,
        carbs: 2.5,
        fat: 28,
        contains_gluten: false,
        contains_dairy: true,
        contains_eggs: false,
        contains_fish: true,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: 'Secar a pele muito bem antes de grelhar é o segredo para obter uma textura incrivelmente crocante sem grudar na grelha.',
        ingredients: [
          {
            name: 'Galetos inteiros abertos pela espinha (estilo borboleta)',
            quantity: '2',
            unit: 'unidades',
          },
          { name: 'Ramos de tomilho fresco e alecrim', quantity: '6', unit: 'ramos' },
          { name: 'Dentes de alho picados', quantity: '4', unit: 'dentes' },
          { name: 'Vinho branco seco', quantity: '80', unit: 'ml' },
          { name: 'Azeite de oliva extra virgem', quantity: '3', unit: 'colheres de sopa' },
          { name: 'Manteiga com sal em temperatura ambiente', quantity: '50', unit: 'g' },
          { name: 'Raspas e suco de limão siciliano', quantity: '1', unit: 'unidade' },
          { name: 'Sal marinho e pimenta-do-reino moída na hora', quantity: '1', unit: 'a gosto' },
        ],
        method: [
          'Abra os galetos ao meio, seque bem a pele com papel toalha e tempere com a marinada de vinho branco, limão, azeite, alho e ervas picadas por 2 horas.',
          'Misture a manteiga amolecida com parte das ervas frescas picadas e um dente de alho ralado; reserve.',
          'Aqueça a grelha ou bistequeira de ferro fundido em fogo médio-alto com um fio de azeite.',
          'Posicione os galetos com a pele virada para baixo e pressione com peso plano para garantir contato uniforme com a grelha.',
          'Grelhe por 15 minutos até a pele ficar intensamente dourada e crocante; vire e grelhe por mais 10 minutos.',
          'Pincele a manteiga de ervas sobre a carne quente nos últimos minutos e deixe descansar por 5 minutos antes de cortar.',
        ],
      },
      {
        title: 'MOLHO SAMBAL',
        slug: 'molho-sambal-cgbe',
        summary:
          'É uma pasta ou molho de pimenta usado como condimento em quase todas as refeições',
        categorySlug: 'molhos-conservas',
        techniqueSlug: 'fermentacao',
        difficulty: 'Fácil',
        yield_quantity: 0,
        yield_unit: 'porções',
        portions: '',
        prep_minutes: 0,
        cook_minutes: 0,
        total_minutes: 0,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: false,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: '',
        ingredients: [
          { name: '-20 pimentas vermelhas', quantity: '15', unit: '' },
          { name: 'alho', quantity: '5', unit: 'dentes' },
          { name: 'chalotas', quantity: '3', unit: '' },
          { name: 'pasta de camarão (belacan)', quantity: '1', unit: 'colher de chá' },
          { name: 'açúcar mascavo', quantity: '1', unit: 'colher de sopa' },
          { name: 'polpa de tamarindo', quantity: '1', unit: 'colher de sopa' },
          { name: 'Sal', quantity: '', unit: 'a gosto' },
        ],
        method: [
          '20 pimentas vermelhas',
          '5 dentes de alho',
          '3 chalotas',
          '1 colher de chá de pasta de camarão (belacan)',
          '1 colher de sopa de açúcar mascavo',
          '1 colher de sopa de polpa de tamarindo',
          'Sal a gosto',
        ],
      },
      {
        title: 'MOLHO DE GENGIBRE E MISSo',
        slug: 'molho-de-gengibre-e-misso-4ly0',
        summary:
          'O molho de gengibre e miso é um tempero cremoso e agridoce muito usado na culinária japonesa, ideal para saladas',
        categorySlug: 'molhos-conservas',
        techniqueSlug: 'fermentacao',
        difficulty: 'Fácil',
        yield_quantity: 0,
        yield_unit: 'porções',
        portions: '',
        prep_minutes: 0,
        cook_minutes: 0,
        total_minutes: 0,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: false,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: '',
        ingredients: [
          { name: 'pasta de miso branco', quantity: '3', unit: 'colheres de sopa' },
          { name: 'vinagre de arroz', quantity: '2', unit: 'colheres de sopa' },
          { name: 'óleo de gergelim', quantity: '1', unit: 'colher de chá' },
          { name: 'azeite de oliva', quantity: '2', unit: 'colheres de sopa' },
          { name: 'gengibre fresco ralado', quantity: '1', unit: 'colher de sopa' },
          { name: 'mel', quantity: '1', unit: 'colher de sopa' },
          { name: 'água', quantity: '2', unit: 'colheres de sopa' },
        ],
        method: ['**MOLHO DE GENGIBRE E MISO**'],
      },
      {
        title: 'Cuscuz Marroquino com Abobrinha e Grão-de-Bico',
        slug: 'cuscuz-marroquino-com-abobrinha-e-grao-de-bico-2dlt',
        summary:
          'A mistura de abobrinha dourada, grão-de-bico, uva-passa e especiarias deixa tudo mais interessante',
        categorySlug: 'saladas',
        techniqueSlug: 'cozido',
        difficulty: 'Fácil',
        yield_quantity: 0,
        yield_unit: 'porções',
        portions: '',
        prep_minutes: 0,
        cook_minutes: 0,
        total_minutes: 0,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: false,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: '',
        ingredients: [
          { name: '(chá) de cuscuz marroquino', quantity: '1', unit: 'xícara' },
          { name: 'grão-de-bico cozido (1½ xícara [chá] de grãos)', quantity: '1', unit: 'lata' },
          { name: 'abobrinha', quantity: '1', unit: '' },
          { name: 'cebola picada', quantity: '1', unit: '' },
          { name: '(chá) de uvas-passas brancas', quantity: '1/4', unit: 'xícara' },
          { name: 'dentes de alho picados fino', quantity: '2', unit: '' },
          { name: '(chá) de água', quantity: '1', unit: 'xícara' },
        ],
        method: [
          'Leve uma chaleira com a água ao fogo alto para ferver.\nNuma tigela média, coloque o cuscuz marroquino, tempere com 1 colher (chá) de sal, regue com a água fervente, misture 1 colher (sopa) de azeite e tampe com um prato por 5 minutos para hidratar.',
          'Enquanto isso, corte a abobrinha em cubos e refogue no azeite com cebola e alho até dourar.',
          'Adicione o grão-de-bico escorrido, as uvas-passas e especiarias a gosto.',
          'Solte os grãos do cuscuz com um garfo e incorpore os legumes dourados delicadamente.',
        ],
      },
      {
        title: 'Cuscuz Marroquino com Damasco e Azeitona',
        slug: 'cuscuz-marroquino-com-damasco-e-azeitona-4ry6',
        summary:
          'A combinação de damasco, cebola dourada, pistache, azeitona e canela cria um prato cheio de texturas e contrastes: tem o adocicado da fruta, o salgadinho da azeitona e o perfume das especiarias.',
        categorySlug: 'saladas',
        techniqueSlug: 'banho-maria',
        difficulty: 'Fácil',
        yield_quantity: 0,
        yield_unit: 'porções',
        portions: '',
        prep_minutes: 0,
        cook_minutes: 0,
        total_minutes: 0,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: false,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: '',
        ingredients: [
          { name: '½ xícara (chá) de cuscuz marroquino', quantity: '1', unit: '' },
          { name: '½ xícara (chá) de água fervente', quantity: '1', unit: '' },
          { name: 'damascos secos picados', quantity: '6', unit: '' },
          { name: 'azeitonas pretas em lascas', quantity: '6', unit: '' },
          { name: 'cebola média fatiada', quantity: '1', unit: '' },
          { name: 'azeite de oliva', quantity: '2', unit: 'colheres de sopa' },
          { name: 'pistache picado', quantity: '2', unit: 'colheres de sopa' },
        ],
        method: [
          'Descasque e corte a cebola em fatias finas, no sentido do comprimento. Corte cada damasco ao meio e fatie em pedaços de cerca de 1 cm. Corte a azeitona em lascas.',
          'Hidrate o cuscuz marroquino com a água fervente temperada com sal por 5 minutos.',
          'Caramelize a cebola lentamente no azeite até dourar. Adicione o damasco e azeitonas.',
          'Misture tudo ao cuscuz soltinho e finalize com pistache tostado picado.',
        ],
      },
      {
        title: 'Pizza de abobrinha',
        slug: 'pizza-de-abobrinha-q0f9',
        summary:
          'Pizza feita com abobrinha! Crocante por fora, macia e cheia de queijo por dentro — uma opção fácil, deliciosa e com poucos carboidratos!',
        categorySlug: 'massas',
        techniqueSlug: 'assado',
        difficulty: 'Fácil',
        yield_quantity: 0,
        yield_unit: 'porções',
        portions: '',
        prep_minutes: 0,
        cook_minutes: 0,
        total_minutes: 0,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: true,
        contains_dairy: true,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: '',
        ingredients: [
          { name: 'abobrinhas médias', quantity: '2', unit: '' },
          { name: 'ovo grande', quantity: '1', unit: '' },
          { name: 'muçarela ralada', quantity: '1', unit: 'xícara' },
          { name: 'parmesão ralado', quantity: '1/4', unit: 'xícara' },
          { name: 'alho em pó', quantity: '1/2', unit: 'colher de chá' },
          { name: 'orégano seco', quantity: '1', unit: 'colher de chá' },
          { name: 'sal e pimenta', quantity: '', unit: 'a gosto' },
        ],
        method: [
          'Rale as abobrinhas e esprema muito bem para retirar o máximo possível de água.',
          'Em uma tigela, misture a abobrinha com o ovo, a muçarela, o parmesão, o alho em pó, o orégano, sal e pimenta.',
          'Espalhe a massa em formato de disco sobre uma assadeira forrada com papel manteiga e asse a 200°C por 20 minutos até dourar.',
          'Cubra com molho de tomate, queijo e cobertura de sua preferência e volte ao forno para gratinar.',
        ],
      },
      {
        title: 'Pão Pita',
        slug: 'pao-pita-65mk',
        summary: 'Pão sírio leve, macio e oco por dentro, perfeito para rechear.',
        categorySlug: 'paes-fermentados',
        techniqueSlug: 'assado',
        difficulty: 'Fácil',
        yield_quantity: 12,
        yield_unit: 'porções',
        portions: 'Pão de 60g',
        prep_minutes: 30,
        cook_minutes: 120,
        total_minutes: 150,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: true,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: 'Assa em menos de 1 minuto em forno bem alto com pedra refratária.',
        ingredients: [
          { name: 'Farinha de trigo', quantity: '500', unit: 'g' },
          { name: 'Fermento biológico seco', quantity: '5', unit: 'g' },
          { name: 'Sal', quantity: '10', unit: 'g' },
          { name: 'Açũcar', quantity: '20', unit: 'g' },
          { name: 'Água morna', quantity: '300', unit: 'ml' },
          { name: 'Azeite', quantity: '20', unit: 'ml' },
        ],
        method: [
          'Dissolva o fermento na água morna com açúcar.',
          'Acrescente 100 g de farinha e reserve por 20 minutos.',
          'Peneire o restante da farinha junto com o sal.',
          'Misture todos os ingredientes e sove até obter massa lisa e elástica.',
          'Divida em 12 bolinhas, abra em discos finos e asse em forno bem quente até inflar.',
        ],
      },
      {
        title: 'Pão Integral',
        slug: 'pao-integral-69qi',
        summary: 'Pão integral artesanal com miolo macio e casca crocante.',
        categorySlug: 'paes-fermentados',
        techniqueSlug: 'assado',
        difficulty: 'Fácil',
        yield_quantity: 0,
        yield_unit: 'porções',
        portions: '',
        prep_minutes: 0,
        cook_minutes: 0,
        total_minutes: 0,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: true,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: '',
        ingredients: [
          { name: 'farinha de trigo', quantity: '25', unit: 'g' },
          { name: 'farinha de trigo integral', quantity: '75', unit: 'g' },
          {
            name: 'fermento biológico seco instantâneo ou 12 g de fermento fresco',
            quantity: '4',
            unit: 'g',
          },
          { name: 'água em temperatura ambiente', quantity: '260', unit: 'ml' },
          { name: 'sal', quantity: '8', unit: 'g' },
        ],
        method: [
          'Preparo e descanso inicial (30 a 60 min).',
          'Mistura base: Junte 300 g de farinha integral com 100 g de farinha branca.',
          'Esponja: Em um pote menor, misture 100 g da mistura de farinhas, 4 g de fermento e água.',
          'Incorpore o restante dos ingredientes e sove até ponto de véu.',
          'Modele e deixe fermentar até dobrar de volume. Asse em forno pré-aquecido a 200°C por 35 minutos.',
        ],
      },
      {
        title: 'Pão Australiano',
        slug: 'pao-australiano-7fuq',
        summary: 'Pão escuro macio, levemente adocicado com cacau e mel, finalizado com fubá.',
        categorySlug: 'paes-fermentados',
        techniqueSlug: 'assado',
        difficulty: 'Fácil',
        yield_quantity: 0,
        yield_unit: 'porções',
        portions: '',
        prep_minutes: 0,
        cook_minutes: 0,
        total_minutes: 0,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: true,
        contains_dairy: true,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: true,
        contains_ave: false,
        contains_camarao: false,
        tips: '',
        ingredients: [
          { name: 'farinha de trigo', quantity: '70', unit: 'g' },
          { name: 'farinha de trigo integral', quantity: '30', unit: 'g' },
          { name: 'água em temperatura ambiente', quantity: '100', unit: 'g' },
          { name: 'cacau em pó 100%', quantity: '15', unit: 'g' },
          { name: 'mel', quantity: '40', unit: 'g' },
          { name: 'manteiga', quantity: '30', unit: 'g' },
          { name: 'fubá para polvilhar', quantity: '', unit: 'a gosto' },
        ],
        method: [
          'Pré-fermento: Na tigela da batedeira, misture 70 g de farinha de trigo, 30 g de farinha integral, o fermento e 100 g de água. Cubra e descanse por 30 a 60 minutos.',
          'Adicione os demais ingredientes, mel e cacau, sovando até homogeneizar.',
          'Modele os pães no formato alongado tradicional, polvilhe com fubá e deixe fermentar.',
          'Asse a 180°C por cerca de 25 a 30 minutos.',
        ],
      },
      {
        title: 'Broa de milho portuguesa',
        slug: 'broa-de-milho-portuguesa-9f1e',
        summary: 'Pão tradicional português de fubá e centeio com casca grossa e miolo denso.',
        categorySlug: 'paes-fermentados',
        techniqueSlug: 'assado',
        difficulty: 'Fácil',
        yield_quantity: 0,
        yield_unit: 'porções',
        portions: '',
        prep_minutes: 0,
        cook_minutes: 0,
        total_minutes: 0,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: true,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: '',
        ingredients: [
          { name: 'farinha de trigo', quantity: '100', unit: 'g' },
          { name: 'fubá de milho fino', quantity: '320', unit: 'g' },
          { name: 'água fervendo', quantity: '320', unit: 'g' },
          { name: 'fermento biológico seco', quantity: '5', unit: 'g' },
          { name: 'sal', quantity: '8', unit: 'g' },
        ],
        method: [
          'Escaldar o fubá: Em uma tigela, misture 320 g de fubá com 320 g de água fervendo. Misture bem e deixe esfriar completamente.',
          'Preparar a esponja com a farinha de trigo, água morna e fermento.',
          'Junte o fubá escaldado à esponja, adicione o sal e sove até incorporar.',
          'Modele em tigela polvilhada com farinha para rachar a crosta naturalmente.',
          'Asse em forno alto pré-aquecido a 220°C até casca dourada e crocante.',
        ],
      },
      {
        title: 'Bacalhau com broa portuguesa',
        slug: 'bacalhau-com-broa-portuguesa-dukm',
        summary:
          'O Bacalhau com Broa é um dos pratos mais emblemáticos e acolhedores da gastronomia tradicional portuguesa. A receita combina a suculência das postas de bacalhau assadas com o contraste crocante de uma crosta aromática de broa de milho.',
        categorySlug: 'peixes',
        techniqueSlug: 'assado',
        difficulty: 'Fácil',
        yield_quantity: 0,
        yield_unit: 'porções',
        portions: '',
        prep_minutes: 0,
        cook_minutes: 0,
        total_minutes: 0,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: true,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: true,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: '',
        ingredients: [
          { name: 'postas ou lombos de bacalhau bem dessalgados', quantity: '4', unit: '' },
          { name: 'broa de milho esfarelada', quantity: '300', unit: 'g' },
          { name: 'batatas pequenas para murro', quantity: '8', unit: '' },
          { name: 'cebolas médias em rodelas', quantity: '2', unit: '' },
          { name: 'dentes de alho picados', quantity: '4', unit: '' },
          { name: 'azeite de oliva virgem', quantity: '150', unit: 'ml' },
        ],
        method: [
          'Assar as batatas a murro: Lave bem as batatas com a casca. Coloque-as inteiras num tabuleiro, salpique com sal grosso e dentes de alho esmagados. Asse até dourarem e dê um murro delicado em cada uma.',
          'Faça uma cebolada dourando as cebolas e o alho em azeite abundante.',
          'Misture a broa esfarelada com alho picado, coentro fresco e azeite até obter uma farofa úmida.',
          'Em um refratário, faça uma cama com a cebolada, disponha as postas de bacalhau e cubra com a broa.',
          'Regue com bastante azeite e leve ao forno pré-aquecido a 190°C por cerca de 25 minutos até a crosta ficar dourada e crocante.',
        ],
      },
      {
        title: 'Panqueca de banana com trigo sarraceno',
        slug: 'panqueca-de-banana-com-trigo-sarraceno-y3ek',
        summary:
          'Panqueca leve, nutritiva e sem glúten feita com banana e farinha de trigo sarraceno.',
        categorySlug: 'paes-fermentados',
        techniqueSlug: 'assado',
        difficulty: 'Fácil',
        yield_quantity: 0,
        yield_unit: 'porções',
        portions: '',
        prep_minutes: 0,
        cook_minutes: 0,
        total_minutes: 0,
        cost: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        contains_gluten: false,
        contains_dairy: false,
        contains_eggs: false,
        contains_fish: false,
        contains_honey: false,
        contains_ave: false,
        contains_camarao: false,
        tips: '',
        ingredients: [
          { name: 'farinha de trigo sarraceno', quantity: '72', unit: 'g' },
          { name: 'flocos de quinoa', quantity: '28', unit: 'g' },
          { name: 'polvilho doce', quantity: '18', unit: 'g' },
          { name: 'fermento em pó', quantity: '5', unit: 'g' },
          { name: 'banana madura amassada', quantity: '1', unit: '' },
          { name: 'bebida vegetal', quantity: '120', unit: 'ml' },
        ],
        method: [
          'Em uma tigela, misture os ingredientes secos e reserve.',
          'Em outro recipiente, bata os ingredientes líquidos com a banana amassada até homogeneizar.',
          'Junte os secos aos líquidos e misture com delicadeza.',
          'Aqueça frigideira antiaderente untada com óleo de coco e doure pequenas porções de massa de ambos os lados.',
        ],
      },
    ]

    const recipeIdMap = {}
    for (const item of recipesData) {
      let rec
      try {
        rec = app.findFirstRecordByData('recipes', 'slug', item.slug)
        recipeIdMap[item.slug] = rec.id
      } catch (_) {
        rec = new Record(recipesCol)
        rec.set('title', item.title)
        rec.set('slug', item.slug)
        rec.set('summary', item.summary)
        if (item.categorySlug && categoryMap[item.categorySlug]) {
          rec.set('category', categoryMap[item.categorySlug])
        }
        if (item.techniqueSlug && techniqueMap[item.techniqueSlug]) {
          rec.set('technique', techniqueMap[item.techniqueSlug])
        }
        rec.set('difficulty', item.difficulty)
        rec.set('yield_quantity', item.yield_quantity)
        rec.set('yield_unit', item.yield_unit)
        rec.set('portions', item.portions)
        rec.set('prep_minutes', item.prep_minutes)
        rec.set('cook_minutes', item.cook_minutes)
        rec.set('total_minutes', item.total_minutes)
        rec.set('cost', item.cost)
        rec.set('calories', item.calories)
        rec.set('protein', item.protein)
        rec.set('carbs', item.carbs)
        rec.set('fat', item.fat)
        rec.set('ingredients', item.ingredients)
        rec.set('method', item.method)
        rec.set('tips', item.tips)
        rec.set('author', userRecord.id)
        rec.set('contains_gluten', item.contains_gluten)
        rec.set('contains_dairy', item.contains_dairy)
        rec.set('contains_eggs', item.contains_eggs)
        rec.set('contains_fish', item.contains_fish)
        rec.set('contains_honey', item.contains_honey)
        rec.set('contains_ave', item.contains_ave)
        rec.set('contains_camarao', item.contains_camarao)
        app.save(rec)
        recipeIdMap[item.slug] = rec.id
      }
    }

    // 5. Collection ("Para imprimir")
    let collectionRecord
    try {
      collectionRecord = app.findFirstRecordByData('collections', 'name', 'Para imprimir')
    } catch (_) {
      collectionRecord = new Record(collectionsCol)
      collectionRecord.set('user', userRecord.id)
      collectionRecord.set('name', 'Para imprimir')
      collectionRecord.set('description', 'Imprimir etiquetas para o Buffet')
      collectionRecord.set('share_token', '')
      app.save(collectionRecord)
    }

    // 6. collection_recipes (5 records linking recipes to "Para imprimir")
    const targetRecipesForCollection = [
      'galeto-grelhado-com-ervas',
      'bolo-fondant-de-chocolate-amargo',
      'pao-de-fermentacao-natural',
      'risoto-de-cogumelos-porcini-e-trufas',
      'moqueca-tradicional-de-peixe-e-camarao',
    ]

    for (const slug of targetRecipesForCollection) {
      const rId = recipeIdMap[slug]
      if (!rId) continue
      try {
        // Check if pair exists
        const existing = app.findRecordsByFilter(
          'collection_recipes',
          'collection = {:col} && recipe = {:rec}',
          '',
          1,
          0,
        )
        // findRecordsByFilter takes bound variables in recent PB or filter string directly
      } catch (_) {}

      // Safely check via app.db() or findRecordsByFilter
      const existing = app.findRecordsByFilter(
        'collection_recipes',
        "collection = '" + collectionRecord.id + "' && recipe = '" + rId + "'",
        '',
        1,
        0,
      )
      if (!existing || existing.length === 0) {
        const cr = new Record(collectionRecipesCol)
        cr.set('collection', collectionRecord.id)
        cr.set('recipe', rId)
        app.save(cr)
      }
    }

    // 7. selected_recipes (5 records)
    const targetRecipesForSelected = [
      'galeto-grelhado-com-ervas',
      'moqueca-tradicional-de-peixe-e-camarao',
      'risoto-de-cogumelos-porcini-e-trufas',
      'pao-de-fermentacao-natural',
      'cuscuz-marroquino-com-abobrinha-e-grao-de-bico-2dlt',
    ]

    for (const slug of targetRecipesForSelected) {
      const rId = recipeIdMap[slug]
      if (!rId) continue
      const existing = app.findRecordsByFilter(
        'selected_recipes',
        "user = '" + userRecord.id + "' && recipe = '" + rId + "'",
        '',
        1,
        0,
      )
      if (!existing || existing.length === 0) {
        const sr = new Record(selectedRecipesCol)
        sr.set('user', userRecord.id)
        sr.set('recipe', rId)
        app.save(sr)
      }
    }
  },
  (app) => {
    // Optional down migration
  },
)
