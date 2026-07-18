export function Card({ children, className = '', hover = false, padding = true }) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-slate-100 shadow-soft
        ${padding ? 'p-6' : ''}
        ${hover ? 'hover:shadow-medium hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function KPICard({ title, value, subtitle, icon: Icon, color = 'teal', trend, trendValue }) {
  const colors = {
    teal: { bg: 'bg-teal-50', text: 'text-teal-700', icon: 'text-teal-600' },
    red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-600' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
  };

  const c = colors[color] || colors.teal;

  return (
    <Card hover>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-soft-gray text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-night-blue mb-1">{value}</p>
          {subtitle && <p className="text-xs text-soft-gray">{subtitle}</p>}
          {trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              <span>{trend === 'up' ? '↑' : '↓'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`${c.bg} rounded-2xl p-3 flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${c.icon}`} />
          </div>
        )}
      </div>
    </Card>
  );
}
