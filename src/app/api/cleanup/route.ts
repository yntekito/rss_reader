import { NextResponse } from 'next/server';
import { cleanupOldContent } from '@/lib/contentDownloader';

export async function POST() {
  console.log('POST /api/cleanup called');
  try {
    console.log('Starting cleanup process...');
    await cleanupOldContent();
    console.log('Cleanup completed successfully');
    return NextResponse.json({ 
      message: '1週間以上経過した記事コンテンツを削除しました',
      success: true 
    });
  } catch (error) {
    console.error('Error cleaning up old content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'クリーンアップに失敗しました' },
      { status: 500 }
    );
  }
}