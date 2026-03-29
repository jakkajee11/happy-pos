export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { db } from '@/lib/db'

export default function KitchenIndexPage() {
  const stations = db.getStations().filter(s => s.isActive)
  const printers = db.getPrinters()
  const kitchenOrders = db.getKitchenOrders()

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
            const stationOrders = kitchenOrders.filter(o => o.stationId === station.id)
            const pendingCount = stationOrders.filter(o => o.status === 'pending').length
            const preparingCount = stationOrders.filter(o => o.status === 'preparing').length
            const readyCount = stationOrders.filter(o => o.status === 'ready').length
            const activeCount = pendingCount + preparingCount
            return (
              <Link
                key={station.id}
                href={`/kitchen/${station.id}`}
                className="group block bg-white rounded-2xl border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all p-6 shadow-sm relative"
              >
                {activeCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 shadow-md">
                    {activeCount}
                  </span>
                )}
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

                {(pendingCount > 0 || preparingCount > 0 || readyCount > 0) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pendingCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg">
                        🟡 รอ {pendingCount}
                      </span>
                    )}
                    {preparingCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                        🔵 กำลังทำ {preparingCount}
                      </span>
                    )}
                    {readyCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                        🟢 เสร็จแล้ว {readyCount}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-300">ไม่มีรายการค้าง</p>
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
