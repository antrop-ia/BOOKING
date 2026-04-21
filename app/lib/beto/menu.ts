export type MenuItem = {
  name: string
  description?: string
  price: number
  tags?: string[]
}

export type MenuCategory = {
  id: string
  name: string
  emoji: string
  note?: string
  items: MenuItem[]
}

export const MENU: MenuCategory[] = [
  {
    id: 'carnes',
    name: 'Carnes',
    emoji: '🥩',
    note: 'Cortes vendidos por gramagem; acompanhamentos podem variar por corte.',
    items: [
      {
        name: 'Picanha Importada 900g',
        description: 'Acompanha arroz, farofa, vinagrete + uma guarnição (feijão, fritas, maionese ou macaxeira).',
        price: 268.9,
        tags: ['compartilhar', 'importada', 'premium'],
      },
      {
        name: 'Maminha Importada 900g',
        description: 'Acompanha arroz, farofa, vinagrete + uma guarnição.',
        price: 219.9,
        tags: ['compartilhar', 'importada'],
      },
      {
        name: 'Picanha Importada 400g',
        description: 'Acompanha farofa e vinagrete.',
        price: 159.0,
        tags: ['casal', 'importada'],
      },
      {
        name: 'Maminha Nacional 900g',
        description: 'Acompanha arroz, farofa, vinagrete + uma guarnição.',
        price: 145.0,
        tags: ['compartilhar', 'nacional'],
      },
      {
        name: 'Prime Rib 750g',
        description: 'Acompanha farofa e vinagrete.',
        price: 139.9,
        tags: ['premium', 'compartilhar'],
      },
      {
        name: 'Cupim Premium com Queijo 500g',
        description: 'Acompanha farofa, vinagrete, cebola na brasa e anéis de cebola.',
        price: 139.9,
        tags: ['cupim', 'queijo'],
      },
      {
        name: 'Short Rib 650g',
        description: 'Acompanha farofa e vinagrete.',
        price: 129.9,
        tags: ['premium', 'costela'],
      },
      {
        name: 'Maminha Importada 400g',
        description: 'Acompanha farofa e vinagrete.',
        price: 109.9,
        tags: ['casal', 'importada'],
      },
      {
        name: 'Maminha Nacional 400g',
        description: 'Acompanha farofa e vinagrete.',
        price: 84.9,
        tags: ['casal', 'nacional'],
      },
      {
        name: 'Galeto Especial',
        description: 'Acompanha arroz, farofa, vinagrete, macarrão, feijão, maionese e fritas. Serve até 4 pessoas.',
        price: 79.9,
        tags: ['frango', 'familia'],
      },
      {
        name: 'Costela Suína 700g',
        description: 'Acompanha farofa, vinagrete e fritas.',
        price: 79.9,
        tags: ['suino', 'compartilhar'],
      },
      {
        name: 'Carne de Sol na Brasa 500g',
        description: 'Acompanha farofa, vinagrete, 2 fatias de queijo coalho, fritas e cebola.',
        price: 79.9,
        tags: ['regional', 'carne-de-sol'],
      },
      {
        name: 'Maminha Acebolada na Chapa 250g',
        description: 'Com fritas e queijo coalho.',
        price: 61.0,
        tags: ['individual'],
      },
      {
        name: 'Galeto Completo',
        description: 'Acompanha arroz, farofa, vinagrete, macarrão e feijão. Serve até 4 pessoas.',
        price: 59.9,
        tags: ['frango', 'familia'],
      },
    ],
  },
  {
    id: 'executivos',
    name: 'Pratos Executivos',
    emoji: '🍽️',
    note: 'Acompanham arroz, farofa, vinagrete + uma guarnição à escolha (exceto parmegianas).',
    items: [
      { name: 'Executivo de Picanha Importada', price: 49.9 },
      { name: 'Executivo de Costela Bovina', price: 44.9 },
      { name: 'Executivo de Maminha Importada', price: 40.9 },
      { name: 'Executivo de Parmegiana de Carne', price: 40.9 },
      { name: 'Executivo de Picanha Nacional', price: 36.0 },
      { name: 'Executivo de Parmegiana de Frango', price: 34.9 },
      { name: 'Executivo de Maminha Nacional', price: 33.9 },
      { name: 'Executivo de Tilápia Empanada', price: 33.9 },
      { name: 'Executivo de Frango', price: 25.9 },
      { name: 'Executivo de Fígado Acebolado', price: 22.9 },
    ],
  },
  {
    id: 'petiscos',
    name: 'Petiscos',
    emoji: '🍤',
    items: [
      { name: 'Picanha Importada Petisco', price: 52.9 },
      { name: 'Camarão Alho e Óleo 300g', price: 49.9 },
      {
        name: 'Parrilla Mix',
        description: 'Anéis de cebola, batata canoa e fritas (300g cada).',
        price: 49.5,
        tags: ['compartilhar'],
      },
      { name: 'Costela Bovina Petisco', price: 46.9 },
      { name: 'Maminha Importada Petisco', price: 44.9 },
      { name: 'Camarão Empanado (10 unid)', price: 39.9 },
      { name: 'Batata Frita c/ Cheddar e Bacon', price: 39.9, tags: ['compartilhar'] },
      {
        name: 'Pasteizinhos (12 unid)',
        description: 'Sabores: Queijo do Reino, Camarão, Frango, Provolone ou Sertanejo.',
        price: 39.9,
      },
      { name: 'Tripinha', price: 39.0 },
      { name: 'Costelinha Suína (3 unid)', price: 39.0 },
      { name: 'Maminha Petisco', price: 36.9 },
      { name: 'Isca de Frango 250g', price: 33.0 },
      { name: 'Moela com Torradas 300g', price: 32.0 },
      { name: 'Anéis de Cebola 300g', price: 32.0 },
      { name: 'Batata Canoa Temperada 300g', price: 29.9 },
      { name: 'Bisteca Suína Petisco', price: 29.9 },
      { name: 'Kibe (6 unid)', price: 29.9 },
      { name: 'Bolinho de Charque (10 unid)', price: 24.9 },
      { name: 'Fritas', price: 19.9 },
      { name: 'Queijo na Brasa (Melaço ou Orégano)', price: 19.9 },
      { name: 'Sanduíche de Costela', price: 19.9 },
      { name: 'Torresmo (Porção)', price: 19.0 },
      { name: 'Toscana (2 unid)', price: 14.0 },
      { name: 'Caldinho de Feijão', price: 13.0 },
      { name: 'Caldinho Moda da Casa', price: 13.0 },
      { name: 'Caldinho de Costela', price: 13.0 },
      { name: 'Pão de Alho Caseiro', price: 9.9 },
      { name: 'Cebola na Brasa', price: 6.99 },
    ],
  },
  {
    id: 'combos',
    name: 'Combos',
    emoji: '🎁',
    items: [
      {
        name: 'Combo 02 — Tábua Família Parrilla',
        description: '400g Maminha + 400g Picanha + acompanhamentos.',
        price: 219.9,
        tags: ['familia', 'compartilhar'],
      },
      {
        name: 'Combo 01 — Meia Tábua Parrilla',
        description: '200g Maminha + 200g Picanha + acompanhamentos.',
        price: 165.0,
        tags: ['casal'],
      },
      { name: 'Combo 03 — Picanha 400g e Fritas', price: 129.9 },
      { name: 'Combo 04 — Maminha 400g e Fritas', price: 95.9 },
      {
        name: 'Combo Tanqueray Redbull',
        description: 'Garrafa Tanqueray 750ml + 4 Red Bull.',
        price: 235.0,
        tags: ['drinks'],
      },
      {
        name: 'Combo Absolut Redbull',
        description: 'Garrafa Absolut + 4 Red Bull.',
        price: 230.0,
        tags: ['drinks'],
      },
    ],
  },
  {
    id: 'cervejas',
    name: 'Cervejas',
    emoji: '🍺',
    items: [
      { name: 'Heineken 600 ml', price: 18.0 },
      { name: 'Petra 600 ml', price: 13.9 },
      { name: 'Black Princess Gold (Puro Malte)', price: 14.0 },
      { name: 'Itaipava 600 ml', price: 10.9 },
      { name: 'Itaipava Premium', price: 12.0 },
      { name: 'Heineken Zero Álcool (Long Neck)', price: 11.9, tags: ['sem-alcool'] },
      { name: 'Zero Álcool (Long Neck)', price: 8.0, tags: ['sem-alcool'] },
    ],
  },
  {
    id: 'drinks',
    name: 'Drinks e Destilados',
    emoji: '🍹',
    items: [
      { name: 'Caipifruta Importada', price: 26.9 },
      { name: 'Gin Tônica', price: 23.0 },
      { name: 'Caipifruta', price: 22.0 },
      { name: 'Caipiroska Importada', price: 21.9 },
      { name: 'Dose Gin Tanqueray', price: 18.0 },
      { name: 'Caipiroska', price: 17.0 },
      { name: 'Dose Old Parr', price: 17.0 },
      { name: 'Dose Chivas', price: 17.0 },
      { name: 'Caipirinha', price: 15.0 },
      { name: 'Dose Absolut', price: 15.0 },
      { name: 'Dose Smirnoff', price: 9.9 },
      { name: 'Dose Cachaça Pitú', price: 5.9 },
    ],
  },
  {
    id: 'bebidas',
    name: 'Bebidas Diversas',
    emoji: '🥤',
    items: [
      { name: 'Água de Coco (Litro)', price: 25.0 },
      { name: 'Energético Red Bull', price: 15.0 },
      { name: 'Água de Coco (Copo)', price: 14.5 },
      { name: 'Energético (sabor disponível)', price: 10.0 },
      { name: 'Suco de Cajá', price: 9.0 },
      { name: 'Suco de Graviola', price: 9.0 },
      { name: 'Suco de Limão', price: 9.0 },
      { name: 'Suco de Maracujá', price: 9.0 },
      { name: 'Refrigerante Lata', price: 7.0 },
      { name: 'Água Tônica', price: 7.0 },
      { name: 'Água Mineral (Com ou Sem Gás)', price: 5.0 },
    ],
  },
  {
    id: 'sobremesas',
    name: 'Sobremesas e Diversos',
    emoji: '🍨',
    items: [
      { name: 'Doce de Leite Ninho', price: 12.9 },
      { name: 'Torta de Bolacha', price: 9.5 },
      { name: 'Rolha (qualquer bebida)', price: 35.0 },
      { name: 'Segunda Via de Comanda', price: 25.0 },
      { name: 'Couvert Artístico (Sexta-feira)', price: 9.9 },
      { name: 'Embalagem para Viagem', price: 2.0 },
    ],
  },
]

export const RESTAURANT_INFO: {
  name: string
  fullName: string
  location: string
  claim: string
  happyHour: string
  signatureDishes: string[]
  whatsapp: string | null
} = {
  name: 'Parrilla 8187',
  fullName: 'Parrilla 8187 — Bar e Churrascaria',
  location: 'Boa Viagem, Recife',
  claim: 'A melhor picanha da cidade',
  happyHour: 'Terça a sexta, das 16h às 20h (preços reduzidos no local)',
  signatureDishes: [
    'Picanha Importada 900g',
    'Tábua Família Parrilla',
    'Cupim Premium com Queijo 500g',
    'Short Rib 650g',
  ],
  // WhatsApp publico do restaurante para botao "Falar com restaurante" em
  // /minhas-reservas/[codigo]. Quando preenchido (formato BR, ex 5581XXXX9999),
  // o botao aparece. Mantido null ate o cliente confirmar o numero oficial.
  whatsapp: null,
}

export function menuAsText(): string {
  const lines: string[] = []
  for (const category of MENU) {
    lines.push(`\n${category.emoji} ${category.name.toUpperCase()}`)
    if (category.note) lines.push(`(${category.note})`)
    for (const item of category.items) {
      const tags = item.tags?.length ? ` [${item.tags.join(', ')}]` : ''
      const desc = item.description ? ` — ${item.description}` : ''
      lines.push(`• ${item.name} — R$ ${item.price.toFixed(2).replace('.', ',')}${desc}${tags}`)
    }
  }
  return lines.join('\n')
}
