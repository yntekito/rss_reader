import { NextResponse } from 'next/server';
import { articleQueries } from '@/lib/db';

export async function POST() {
  console.log('POST /api/reset-downloads called');
  try {
    console.log('Resetting content_downloaded flags...');
    const result = articleQueries.resetDownloadFlags.run();
    console.log('Reset', result.changes, 'articles');
    return NextResponse.json({ 
      message: `${result.changes}件の記事のダウンロードフラグをリセットしました`,
      success: true,
      resetCount: result.changes
    });
  } catch (error) {
    console.error('Error resetting download flags:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'リセットに失敗しました' },
      { status: 500 }
    );
  }
}