import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Cookieの確認
  const cookies = request.cookies.getAll();
  console.log('Middleware - Cookies:', cookies.map(c => c.name));

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // デバッグログ
  console.log('Middleware - Path:', request.nextUrl.pathname);
  console.log('Middleware - User:', user?.email || 'not authenticated');
  console.log('Middleware - Auth Error:', authError?.message || 'none');

  // 本番環境でdebugページへのアクセスを制限
  if (
    process.env.NODE_ENV === 'production' &&
    request.nextUrl.pathname.startsWith('/debug')
  ) {
    console.log('→ Redirecting to / (debug page is disabled in production)');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 認証が必要なルートの保護
  if (!user && request.nextUrl.pathname.startsWith('/onboarding')) {
    console.log('→ Redirecting to /login (onboarding requires auth)');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!user && request.nextUrl.pathname.startsWith('/graph')) {
    console.log('→ Redirecting to /login (graph requires auth)');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ログイン済みユーザーがログインページにアクセスした場合
  if (user && request.nextUrl.pathname === '/login') {
    console.log('→ Redirecting to /graph (already authenticated)');
    return NextResponse.redirect(new URL('/graph', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
