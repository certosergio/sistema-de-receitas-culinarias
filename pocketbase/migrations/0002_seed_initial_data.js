migrate(
  (app) => {
    // 1. Seed initial user: certosergio@gmail.com
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'certosergio@gmail.com')
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail('certosergio@gmail.com')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Sérgio')
      app.save(userRecord)
    }

    // 2. Seed Categories
    const categoriesCol = app.findCollectionByNameOrId('categories')
    const initialCategories = [
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
    ]

    for (const cat of initialCategories) {
      try {
        app.findFirstRecordByData('categories', 'slug', cat.slug)
      } catch (_) {
        const record = new Record(categoriesCol)
        record.set('name', cat.name)
        record.set('slug', cat.slug)
        record.set('description', cat.description)
        record.set('color', cat.color)
        app.save(record)
      }
    }

    // 3. Seed Techniques
    const techniquesCol = app.findCollectionByNameOrId('techniques')
    const initialTechniques = [
      {
        name: 'Grelhado',
        slug: 'grelhado',
        description: 'Cozimento rápido sob calor direto intenso, criando crosta caramelizada.',
      },
      {
        name: 'Assado',
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
    ]

    for (const tech of initialTechniques) {
      try {
        app.findFirstRecordByData('techniques', 'slug', tech.slug)
      } catch (_) {
        const record = new Record(techniquesCol)
        record.set('name', tech.name)
        record.set('slug', tech.slug)
        record.set('description', tech.description)
        app.save(record)
      }
    }

    // 4. Seed Recipes (4-5 complete, realistic recipes)
    const recipesCol = app.findCollectionByNameOrId('recipes')

    const sampleRecipes = [
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
        ingredients: [
          { name: 'Farinha de trigo especial (tipo 1 ou Manitoba)', quantity: '450', unit: 'g' },
          { name: 'Farinha de trigo integral fina', quantity: '50', unit: 'g' },
          { name: 'Água mineral fria (75% hidratação)', quantity: '375', unit: 'ml' },
          { name: 'Levain ativo no pico de fermentação', quantity: '100', unit: 'g' },
          { name: 'Sal marinho fino', quantity: '10', unit: 'g' },
        ],
        method: [
          'Faça a autólise misturando as farinhas e 350ml de água até incorporar. Cubra e descanse por 45 minutos.',
          'Adicione o fermento natural (levain) ativo e sove delicadamente até incorporar por completo.',
          "Acrescente o sal dissolvido nos 25ml restantes de água. Realize dobras 'slap and fold' por 5 minutos.",
          'Inicie a primeira fermentação em bloco: realize 4 sessões de dobras esticando a massa a cada 30 minutos.',
          'Faça a pré-modelagem redonda, deixe descansar por 20 minutos sob bancada enfarinhada.',
          'Modele no formato batard ou boule e transfira para o banneton polvilhado com farinha de arroz. Leve à geladeira por 14 a 18 horas.',
          'Aqueça a panela de ferro no forno a 250°C por 45 minutos. Vire a massa na panela, faça o corte com lâmina e asse tampado por 20 min.',
          'Retire a tampa, reduza o forno para 220°C e asse por mais 25 minutos até atingir crosta dourada e som oco ao bater no fundo.',
        ],
        tips: 'Use água sem cloro para não inibir as leveduras selvagens. Espere o pão esfriar por pelo menos 2 horas antes de cortar para assentar a umidade do miolo.',
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
        cost: 48.0,
        calories: 420,
        protein: 11.5,
        carbs: 58.0,
        fat: 14.2,
        ingredients: [
          { name: 'Arroz Carnaroli ou Arbóreo', quantity: '320', unit: 'g' },
          { name: 'Cogumelos Porcini secos', quantity: '30', unit: 'g' },
          { name: 'Cogumelos Paris e Shimeji frescos fatiados', quantity: '250', unit: 'g' },
          { name: 'Caldo de legumes caseiro bem quente', quantity: '1.2', unit: 'L' },
          { name: 'Vinho branco seco de boa qualidade', quantity: '120', unit: 'ml' },
          { name: 'Cebola chalota picada finamente', quantity: '1', unit: 'unidades' },
          { name: 'Manteiga sem sal bem gelada em cubos', quantity: '60', unit: 'g' },
          { name: 'Queijo Parmigiano Reggiano ralado na hora', quantity: '80', unit: 'g' },
          { name: 'Azeite de oliva extravirgem', quantity: '30', unit: 'ml' },
          { name: 'Sal marinho e pimenta-do-reino moída na hora', quantity: 'a gosto', unit: '' },
        ],
        method: [
          'Hidrate o Porcini em 200ml de água morna por 20 minutos. Coe a água e adicione-a à panela com o caldo de legumes aquecido.',
          'Em uma frigideira ampla, salteie os cogumelos frescos e o porcini no azeite quente até dourarem. Reserve metade para a finalização.',
          'Em uma panela de fundo espesso, refogue a chalota no azeite até ficar translúcida sem queimar.',
          'Adicione o arroz e toste os grãos por 2 minutos (tostatura) até ficarem perolados.',
          'Despeje o vinho branco frio e mexa vigorosamente até evaporar o álcool por completo.',
          'Vá adicionando o caldo quente concha a concha, mexendo ritmicamente para liberar o amido, mantendo fervura suave por 16-18 minutos.',
          'Quando o arroz estiver al dente, desligue o fogo. Adicione os cogumelos salteados, a manteiga gelada e o parmesão (mantecatura).',
          "Bata a panela com movimentos firmes até criar textura cremosa 'all'onda'. Tampe por 2 minutos antes de empratar.",
        ],
        tips: 'A manteiga deve estar obrigatoriamente gelada no momento da mantecatura para criar uma emulsão perfeita com o amido do arroz.',
      },
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
        cost: 72.0,
        calories: 380,
        protein: 34.0,
        carbs: 12.0,
        fat: 22.0,
        ingredients: [
          { name: 'Postas de Robalo ou Badejo fresco', quantity: '1', unit: 'kg' },
          { name: 'Camarões médios limpos', quantity: '400', unit: 'g' },
          { name: 'Leite de coco artesanal espesso', quantity: '400', unit: 'ml' },
          { name: 'Azeite de dendê legítimo', quantity: '45', unit: 'ml' },
          { name: 'Tomates maduros fatiados em rodelas', quantity: '3', unit: 'unidades' },
          { name: 'Pimentão vermelho e amarelo em rodelas', quantity: '2', unit: 'unidades' },
          { name: 'Cebolas roxas médias em rodelas', quantity: '2', unit: 'unidades' },
          { name: 'Coentro fresco picado e cebolinha', quantity: '1', unit: 'xícaras' },
          { name: 'Suco de limões taiti', quantity: '2', unit: 'unidades' },
          {
            name: 'Alho picado e pimenta dedo-de-moça sem sementes',
            quantity: '4',
            unit: 'dentes',
          },
        ],
        method: [
          'Marine as postas de peixe e os camarões com suco de limão, alho, sal e pimenta por 20 minutos.',
          'Na panela de barro aquecida, monte camadas com cebola, pimentões, tomates e postas de peixe temperadas.',
          'Regue com metade do azeite de dendê e todo o leite de coco. Cubra com bastante coentro fresco.',
          'Leve ao fogo médio com a panela tampada por cerca de 15 minutos sem mexer para não desmanchar o peixe.',
          'Adicione os camarões nos últimos 6 minutos de cozimento e finalize com o restante do azeite de dendê.',
          'Desligue o fogo e mantenha tampado por 5 minutos antes de servir com arroz branco e farofa de dendê.',
        ],
        tips: 'Não mexa com colher durante o cozimento; apenas balance suavemente a panela pelas alças para integrar os sabores sem quebrar as postas.',
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
        protein: 42.0,
        carbs: 2.5,
        fat: 28.0,
        ingredients: [
          {
            name: 'Galetos inteiros abertos pela espinha (estilo borboleta)',
            quantity: '2',
            unit: 'unidades',
          },
          { name: 'Ramos de tomilho fresco e alecrim', quantity: '6', unit: 'ramos' },
          { name: 'Dentes de alho amassados com a casca', quantity: '6', unit: 'unidades' },
          { name: 'Manteiga amolecida', quantity: '50', unit: 'g' },
          { name: 'Raspas e suco de limão siciliano', quantity: '1', unit: 'unidades' },
          { name: 'Vinho branco seco', quantity: '80', unit: 'ml' },
          { name: 'Azeite de oliva extravirgem', quantity: '40', unit: 'ml' },
          { name: 'Flor de sal e pimenta preta', quantity: 'a gosto', unit: '' },
        ],
        method: [
          'Abra os galetos ao meio, seque bem a pele com papel toalha e tempere com a marinada de vinho branco, limão, azeite, alho e ervas picadas por 2 horas.',
          'Misture a manteiga amolecida com parte das ervas frescas, sal e raspas de limão. Espalhe uma camada fina sob a pele do peito e coxas.',
          'Aqueça a grelha ou frigideira de ferro fundido em fogo médio-alto até ficar bem quente.',
          'Posicione as aves com a pele virada para baixo, aplicando um peso leve (como uma tampa pesada) para contato uniforme.',
          'Grelhe por 14 a 16 minutos até que a pele fique intensamente dourada e crocante.',
          'Vire com cuidado e termine o cozimento do lado da carne por mais 8 a 10 minutos até a temperatura interna atingir 74°C.',
          'Deixe a carne descansar por 5 minutos sobre tábua antes de fatiar para redistribuir os sucos.',
        ],
        tips: 'Secar a pele muito bem antes de grelhar é o segredo para obter uma textura incrivelmente crocante sem grudar na grelha.',
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
        cost: 26.0,
        calories: 340,
        protein: 5.8,
        carbs: 29.4,
        fat: 21.6,
        ingredients: [
          { name: 'Chocolate meio amargo 70% cacau picado', quantity: '200', unit: 'g' },
          { name: 'Manteiga sem sal em cubos', quantity: '150', unit: 'g' },
          {
            name: 'Ovos caipiras inteiros em temperatura ambiente',
            quantity: '4',
            unit: 'unidades',
          },
          { name: 'Açúcar demerara ou cristal fino', quantity: '120', unit: 'g' },
          { name: 'Farinha de trigo peneirada', quantity: '45', unit: 'g' },
          { name: 'Cacau em pó 100% alcalino para a forma', quantity: '15', unit: 'g' },
          { name: 'Extrato puro de baunilha', quantity: '5', unit: 'ml' },
          { name: 'Pitada de flor de sal', quantity: '1', unit: 'pitada' },
        ],
        method: [
          'Derreta o chocolate picado e a manteiga em banho-maria suave ou micro-ondas em potência média, mexendo até ficar homogêneo e brilhante.',
          'Em uma tigela grande, bata os ovos com o açúcar e o extrato de baunilha com um fouet até espumar levemente sem criar ar excessivo.',
          'Incorpore o chocolate derretido morno à mistura de ovos delicadamente.',
          'Peneire a farinha e a flor de sal sobre a massa e envolva com uma espátula de silicone apenas até sumir o pó branco.',
          'Unte uma forma redonda de 20cm com manteiga e polvilhe cacau em pó. Despeje a massa nivelando a superfície.',
          'Asse em forno pré-aquecido a 180°C por exatos 20 a 22 minutos. O topo deve formar uma película fina e o centro permanecer trêmulo.',
          'Retire do forno e deixe amornar por 15 minutos antes de desenformar. Sirva morno com creme inglês ou frutas vermelhas.',
        ],
        tips: 'Não asse em excesso para manter o coração aveludado e cremoso. Cada forno varia, verifique o centro aos 18 minutos.',
      },
    ]

    for (const recipe of sampleRecipes) {
      try {
        app.findFirstRecordByData('recipes', 'slug', recipe.slug)
      } catch (_) {
        let catRecord = null
        let techRecord = null
        try {
          catRecord = app.findFirstRecordByData('categories', 'slug', recipe.categorySlug)
        } catch (_) {}
        try {
          techRecord = app.findFirstRecordByData('techniques', 'slug', recipe.techniqueSlug)
        } catch (_) {}

        const record = new Record(recipesCol)
        record.set('title', recipe.title)
        record.set('slug', recipe.slug)
        record.set('summary', recipe.summary)
        if (catRecord) record.set('category', catRecord.id)
        if (techRecord) record.set('technique', techRecord.id)
        record.set('difficulty', recipe.difficulty)
        record.set('yield_quantity', recipe.yield_quantity)
        record.set('yield_unit', recipe.yield_unit)
        record.set('portions', recipe.portions)
        record.set('prep_minutes', recipe.prep_minutes)
        record.set('cook_minutes', recipe.cook_minutes)
        record.set('total_minutes', recipe.total_minutes)
        record.set('cost', recipe.cost)
        record.set('calories', recipe.calories)
        record.set('protein', recipe.protein)
        record.set('carbs', recipe.carbs)
        record.set('fat', recipe.fat)
        record.set('ingredients', recipe.ingredients)
        record.set('method', recipe.method)
        record.set('tips', recipe.tips)
        if (userRecord) record.set('author', userRecord.id)
        record.set('cover', null)
        app.save(record)
      }
    }
  },
  (app) => {
    // Revert logic if needed
  },
)
