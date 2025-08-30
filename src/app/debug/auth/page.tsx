import { AuthDebug } from '@/components/debug/AuthDebug'

export default function AuthDebugPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Google Auth Debug
                    </h1>
                    <p className="text-gray-600">
                        Test your Google authentication setup
                    </p>
                </div>

                <AuthDebug />

                <div className="mt-8 text-center">
                    <a
                        href="/login"
                        className="text-blue-600 hover:text-blue-700 underline"
                    >
                        ← Back to Login
                    </a>
                </div>
            </div>
        </div>
    )
}