import {Injectable, NotFoundException} from '@nestjs/common';
import {Book, User} from "@prisma/client";
import {PrismaService} from "../prisma.service";
import {CreateBookDto} from "./dto/book.dto";
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

@Injectable()
export class BooksService {
    constructor(private readonly prisma: PrismaService) {}

    async getAllBooks(difficulty?: number): Promise<Book[]> {

        const books = await this.prisma.book.findMany({
            where: {
                difficulty: difficulty !== undefined ? { equals: +difficulty } : undefined,
            }
        });
        return books;
    }
    async createBook(createBookDto: CreateBookDto): Promise<Book> {
        const filePath = 'uploads/texts/' + uuidv4() + '.txt';
        fs.writeFileSync(filePath, createBookDto.text);
        return this.prisma.book.create({
            data: {
                title: createBookDto.title,
                textUrl: filePath,
                description: createBookDto.description,
                author: createBookDto.author,
                coverImageUrl : createBookDto.coverImageUrl,
                difficulty: +createBookDto.difficulty,
            },
        });
    }
    async getBookTextFilePath(id: number): Promise<string | null> {
        const book = await this.prisma.book.findUnique({
            where: {
                id: +id
            }
        });
        return book?.textUrl || null;
    }
    async getBookById(id:number) : Promise<Book | null> {
        const book = await this.prisma.book.findUnique({
            where: {
                id: +id
            }
        });
        return book || null;
    }
    async toggleFavoriteBook(userId: number, bookId: number): Promise<User> {

        const user = await this.prisma.user.findUnique({ where: { id: +userId }, include: { favorites: true } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const isBookInFavorites = user.favorites.some((book) => book.id === +bookId);

        if (isBookInFavorites) {
            await this.prisma.user.update({
                where: { id: +userId },
                data: { favorites: { disconnect: { id: +bookId } } },
            });
        } else {
            await this.prisma.user.update({
                where: { id: +userId },
                data: { favorites: { connect: { id: +bookId } } },
            });
        }
        return this.prisma.user.findUnique({ where: { id: +userId }, include: { favorites: true } });
    }
    async getFavoriteBooks(userId: number): Promise<Book[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: +userId },
            include: { favorites: true },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user.favorites;
    }
}
