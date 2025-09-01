import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentifizierung fehlgeschlagen
          </h1>
          
          <p className="text-gray-600 mb-6">
            Der Authentifizierungslink ist ungültig oder abgelaufen. 
            Bitte fordere einen neuen Link an.
          </p>
          
          <div className="space-y-3">
            <Link 
              href="/reset-password" 
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Neuen Reset-Link anfordern
            </Link>
            
            <Link 
              href="/login"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Zur Anmeldung
            </Link>
          </div>
          
          <div className="mt-6 text-sm text-gray-500">
            <p>Falls das Problem weiterhin besteht, kontaktiere bitte den Support.</p>
          </div>
        </div>
      </div>
    </div>
  )
}