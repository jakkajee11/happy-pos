export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { db } from '@/lib/db'

export default function KitchenIndexPage() {
  const stations = db.getStations().filter(s => s.isActive)
  const printers = db.getPrinters()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kitchen Display</h1>
        <p className="text-gray-500 text-sm mt-1">เลือกสถานีเพื่อเปิดหน้าจอสำหรับครัว/บาร์</p>
      </div>

      {stations.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">🍳</p>
          <p className="text-lg font-medium text-gray-500">ยังไม่มีสถานี</p>
          <p className="text-sm mt-1">ไปที่ ตั้งค่า → สถานี เพื่อสร้างสถานีครัว/บาร์</p>
          <Link
            href="/settings"
            className="mt-4 inline-block px-5 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            ไปที่ตั้งค่า
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
          {stations.map(station => {
            const printer = station.printerId ? printers.find(p => p.id === station.printerId) : null
            return (
              <Link
                key={station.id}
                href={`/kitchen/${station.id}`}
                className="group block bg-white rounded-2xl border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all p-6 shadow-sm"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-4"
                  style={{ backgroundColor: station.color }}
                >
                  {station.name[0]}
                </div>
                <h2 className="text-xl font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                  {station.name}
                </h2>
                {printer ? (
                  <p className="text-xs text-gray-400 mt-1">🖨️ {printer.name}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">ไม่มีเครื่องพิมพ์</p>
                )}
                <div className="mt-4 flex items-center gap-1 text-sm text-orange-500 font-medium">
                  เปิดหน้าจอครัว →
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
