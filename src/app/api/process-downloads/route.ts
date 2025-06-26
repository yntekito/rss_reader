import { NextResponse } from 'next/server';
import { processUndownloadedArticles } from '@/lib/contentDownloader';

export async function POST() {
  console.log('POST /api/process-downloads called');
  try {
    console.log('Starting manual content download processing...');
    await processUndownloadedArticles();
    console.log('Content download processing completed');
    return NextResponse.json({ 
      message: 'コンテンツダウンロード処理が完了しました',
      success: true 
    });
  } catch (error) {
    console.error('Error processing downloads:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ダウンロード処理に失敗しました' },
      { status: 500 }
    );
  }
}