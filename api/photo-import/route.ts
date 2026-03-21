// API route for OCR recipe import - minimal test version
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
  
import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'node-html-parser'
