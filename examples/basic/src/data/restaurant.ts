export const restaurant = {
  name: 'Juniper Table',
  tagline: 'Seasonal neighborhood dining in Portland.',
  phone: '(503) 555-0184',
  email: 'hello@junipertable.example',
  address: {
    street: '1842 NW Alder Street',
    city: 'Portland',
    region: 'OR',
    postalCode: '97209'
  },
  hours: [
    ['Monday', 'Closed'],
    ['Tuesday', '5:00 PM – 10:00 PM'],
    ['Wednesday', '5:00 PM – 10:00 PM'],
    ['Thursday', '5:00 PM – 10:00 PM'],
    ['Friday', '5:00 PM – 11:00 PM'],
    ['Saturday', '11:00 AM – 11:00 PM'],
    ['Sunday', '11:00 AM – 9:00 PM']
  ]
} as const;

export const menu = [
  {
    title: 'Small Plates',
    items: [
      { name: 'Roasted Carrot Hummus', description: 'Grilled flatbread, chili oil, herbs.', price: '$13' },
      { name: 'Crispy Potatoes', description: 'Garlic aioli, smoked paprika, chives.', price: '$11' },
      { name: 'Burrata', description: 'Stone fruit, basil, aged balsamic.', price: '$16' }
    ]
  },
  {
    title: 'Mains',
    items: [
      { name: 'Mushroom Risotto', description: 'Parmesan, thyme, roasted maitake.', price: '$24' },
      { name: 'Pan-Seared Salmon', description: 'Lemon beurre blanc, asparagus, new potatoes.', price: '$29' },
      { name: 'Heritage Pork Chop', description: 'Apple mostarda, charred greens, jus.', price: '$32' }
    ]
  },
  {
    title: 'Drinks',
    items: [
      { name: 'House Spritz', description: 'Aperitivo, sparkling wine, citrus.', price: '$13' },
      { name: 'Juniper Collins', description: 'Gin, lemon, rosemary, soda.', price: '$14' },
      { name: 'Seasonal Lemonade', description: 'Rotating fruit, mint, sparkling water.', price: '$7' }
    ]
  }
] as const;
