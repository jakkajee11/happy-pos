import { db } from '@/lib/db'
import ProductsClient from '@/components/ProductsClient'

export const dynamic = 'force-dynamic'

export default function ProductsPage() {
  const products = db.getProducts()
  const categories = db.getCategories()
  const stations = db.getStations()
  const ingredients = db.getIngredients()
  return <ProductsClient initialProducts={products} initialCategories={categories} initialStations={stations} initialIngredients={ingredients} />
}
