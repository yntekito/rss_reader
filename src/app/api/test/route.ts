import { NextResponse } from 'next/server';

export async function GET() {
  console.log('TEST API called');
  return NextResponse.json({ message: 'API is working', timestamp: new Date().toISOString() });
}

export async function POST() {
  console.log('TEST POST API called');
  return NextResponse.json({ message: 'POST API is working', timestamp: new Date().toISOString() });
}