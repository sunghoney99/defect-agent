import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const uploads = await prisma.upload.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        })
        return NextResponse.json(uploads)
    } catch (error: any) {
        console.error('Failed to fetch uploads:', error)
        return NextResponse.json({
            error: 'Failed to fetch uploads',
            details: error.message
        }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { month, fileName } = body

        const newUpload = await prisma.upload.create({
            data: {
                month,
                fileName
            }
        })

        return NextResponse.json(newUpload)
    } catch (error) {
        console.error('Failed to create upload:', error)
        return NextResponse.json({ error: 'Failed to create upload' }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const idStr = searchParams.get('id')
        if (!idStr) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        }

        const id = parseInt(idStr)
        if (isNaN(id)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
        }

        await prisma.upload.delete({
            where: { id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete upload:', error)
        return NextResponse.json({ error: 'Failed to delete upload' }, { status: 500 })
    }
}

