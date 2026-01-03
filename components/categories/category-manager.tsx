'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCategories, deleteCategory } from '@/actions/transactions';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Trash2, ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { CreateCategoryDialog } from './create-category-dialog';
import { EditCategoryDialog } from './edit-category-dialog';

interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense' | 'savings';
    icon: string | null;
    isDefault: boolean;
}

export function CategoryManager() {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data as Category[]);
        } catch (error) {
            console.error('Failed to categories', error);
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            const result = await deleteCategory(id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Category deleted');
                fetchCategories();
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to delete', error);
            toast.error('Failed to delete category');
        }
    };

    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');
    const savingsCategories = categories.filter(c => c.type === 'savings');

    const CategoryTable = ({ data, type }: { data: Category[], type: 'income' | 'expense' | 'savings' }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Emoji</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                No {type} categories found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell className="text-2xl">{category.icon || '📝'}</TableCell>
                                <TableCell className="font-medium">{category.name}</TableCell>
                                <TableCell className="text-right">
                                    {!category.isDefault && (
                                        <>
                                            <EditCategoryDialog
                                                category={category}
                                                onSuccess={fetchCategories}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(category.id, category.name)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading categories...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
                    <p className="text-muted-foreground">
                        Manage your income and expense categories.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CreateCategoryDialog onSuccess={fetchCategories} />
                </div>
            </div>

            <Tabs defaultValue="expense" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="expense" className="gap-2">
                        <ArrowDownLeft className="h-4 w-4" />
                        Expenses
                    </TabsTrigger>
                    <TabsTrigger value="income" className="gap-2">
                        <ArrowUpRight className="h-4 w-4" />
                        Income
                    </TabsTrigger>
                    <TabsTrigger value="savings" className="gap-2">
                        <Wallet className="h-4 w-4" />
                        Savings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="expense" className="space-y-4 mt-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Expense Categories</h3>
                        <CreateCategoryDialog
                            defaultType="expense"
                            onSuccess={fetchCategories}
                            trigger={<Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> Add Expense Category</Button>}
                        />
                    </div>
                    <CategoryTable data={expenseCategories} type="expense" />
                </TabsContent>

                <TabsContent value="income" className="space-y-4 mt-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Income Categories</h3>
                        <CreateCategoryDialog
                            defaultType="income"
                            onSuccess={fetchCategories}
                            trigger={<Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> Add Income Category</Button>}
                        />
                    </div>
                    <CategoryTable data={incomeCategories} type="income" />
                </TabsContent>

                <TabsContent value="savings" className="space-y-4 mt-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Savings Categories</h3>
                        <CreateCategoryDialog
                            defaultType="savings"
                            onSuccess={fetchCategories}
                            trigger={<Button variant="outline" size="sm"><Plus className="mr-2 h-4 w-4" /> Add Savings Category</Button>}
                        />
                    </div>
                    <CategoryTable data={savingsCategories} type="savings" />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Helper icon for secondary buttons
function Plus({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
        </svg>
    )
}
