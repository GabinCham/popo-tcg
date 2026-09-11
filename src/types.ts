export type Booster = {
  code: string
  name: string
  packId: string
  sortOrder: number
  secCount: number
}

export type SecCard = {
  id: string
  boosterCode: string
  name: string
  imageUrl: string
  parallel: boolean
}

export type Catalog = {
  boosters: Booster[]
  cards: SecCard[]
}
