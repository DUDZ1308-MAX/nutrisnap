import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white transition hover:bg-gray-700"
          >
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
