import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/utils';

// Register standard fonts if needed, or use defaults (Helvetica is built-in)
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#E6F9F0', // Light green background from image
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold', // Helvetica-Bold
        marginBottom: 10,
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold',
    },
    monthBar: {
        backgroundColor: '#D9D3D3', // Greyish bar
        padding: 5,
        width: '100%',
        marginBottom: 20,
    },
    monthText: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
    },
    container: {
        flexDirection: 'row',
        gap: 20,
        flex: 1,
    },
    column: {
        flex: 1,
        flexDirection: 'column',
        gap: 20,
    },
    section: {
        marginBottom: 0,
    },
    sectionTitleBar: {
        backgroundColor: '#D9D3D3',
        padding: 4,
        marginBottom: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        textTransform: 'uppercase',
    },
    table: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#000',
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        height: 18, // Fixed height slots
        alignItems: 'center',
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    cell: {
        paddingHorizontal: 4,
        fontSize: 9,
    },
    cellLabel: {
        flex: 1, // Left part
        borderRightWidth: 1,
        borderRightColor: '#000',
        height: '100%',
        justifyContent: 'center',
    },
    cellValue: {
        width: 80, // Fixed width for amounts
        height: '100%',
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    totalRow: {
        backgroundColor: '#E6F9F0', // Or just transparent
    },
    // Notes box
    notesBox: {
        marginTop: 'auto',
        backgroundColor: '#D9D3D3',
        height: 150,
        padding: 10,
    },
    notesLabel: {
        fontSize: 12,
        textAlign: 'center',
        fontFamily: 'Helvetica-Bold',
    },
});

interface TransactionItem {
    description: string;
    amount: number;
    date?: Date | string;
}

interface BudgetData {
    income: TransactionItem[];
    needs: TransactionItem[];
    wants: TransactionItem[];
    savings: TransactionItem[];
    totals: {
        totalIncome: number;
        totalNeeds: number;
        totalWants: number;
        totalSavings: number;
        expenses: number;
        balance: number;
    };
    monthLabel: string;
}

// Reusable Table Component
const BudgetTable = ({
    title,
    items,
    total,
    rowCount = 8,
    showTotal = true,
    currency = 'USD'
}: {
    title: string;
    items: TransactionItem[];
    total?: number;
    rowCount?: number;
    showTotal?: boolean;
    currency?: string;
}) => {
    // Fill remaining rows with empty items to maintain layout structure
    const filledItems = [...items];
    while (filledItems.length < rowCount) {
        filledItems.push({ description: '', amount: 0 }); // 0 amount will be hidden
    }

    return (
        <View style={styles.section}>
            <View style={styles.sectionTitleBar}>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.table}>
                {filledItems.map((item, i) => (
                    <View key={i} style={[styles.row, i === filledItems.length - 1 && !showTotal ? styles.lastRow : {}]}>
                        <View style={[styles.cell, styles.cellLabel]}>
                            {item.description ? <Text>{item.description}</Text> : null}
                        </View>
                        <View style={[styles.cell, styles.cellValue]}>
                            {/* Only show amount if it's a real item (description exists) or explicit */}
                            {item.description ? <Text>{formatCurrency(item.amount, currency)}</Text> : null}
                        </View>
                    </View>
                ))}

                {showTotal && (
                    <View style={[styles.row, styles.lastRow]}>
                        <View style={[styles.cell, styles.cellLabel, { alignItems: 'flex-end', paddingRight: 10 }]}>
                            <Text style={{ fontFamily: 'Helvetica-Bold' }}>TOTAL</Text>
                        </View>
                        <View style={[styles.cell, styles.cellValue]}>
                            <Text>{formatCurrency(total || 0, currency)}</Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

// Summary Table Component
const SummaryTable = ({ totals, currency = 'USD' }: { totals: BudgetData['totals'], currency?: string }) => (
    <View style={styles.section}>
        <View style={styles.sectionTitleBar}>
            <Text style={styles.sectionTitle}>MONTHLY SUMMARY</Text>
        </View>
        <View style={styles.table}>
            <View style={styles.row}>
                <View style={[styles.cell, styles.cellLabel]}><Text>Total Income</Text></View>
                <View style={[styles.cell, styles.cellValue]}><Text>{formatCurrency(totals.totalIncome, currency)}</Text></View>
            </View>
            <View style={styles.row}>
                <View style={[styles.cell, styles.cellLabel]}><Text>Total Needs</Text></View>
                <View style={[styles.cell, styles.cellValue]}><Text>- {formatCurrency(totals.totalNeeds, currency)}</Text></View>
            </View>
            <View style={styles.row}>
                <View style={[styles.cell, styles.cellLabel]}><Text>Total Wants</Text></View>
                <View style={[styles.cell, styles.cellValue]}><Text>- {formatCurrency(totals.totalWants, currency)}</Text></View>
            </View>
            <View style={styles.row}>
                <View style={[styles.cell, styles.cellLabel]}><Text>Total Savings</Text></View>
                <View style={[styles.cell, styles.cellValue]}><Text>- {formatCurrency(totals.totalSavings, currency)}</Text></View>
            </View>
            <View style={[styles.row, styles.lastRow]}>
                <View style={[styles.cell, styles.cellLabel]}><Text style={{ fontFamily: 'Helvetica-Bold' }}>REMAINING</Text></View>
                <View style={[styles.cell, styles.cellValue]}><Text>{formatCurrency(totals.balance, currency)}</Text></View>
            </View>
        </View>
    </View>
);

export const BudgetPdfDocument = ({ data, currency = 'USD' }: { data: BudgetData, currency?: string }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>MONTHLY BUDGET</Text>
            </View>

            {/* Month Bar */}
            <View style={styles.monthBar}>
                <Text style={styles.monthText}>MONTH OF: {data.monthLabel}</Text>
            </View>

            <View style={styles.container}>
                {/* Left Column */}
                <View style={styles.column}>
                    <BudgetTable
                        title="INCOME"
                        items={data.income}
                        total={data.totals.totalIncome}
                        rowCount={6}
                        currency={currency}
                    />

                    <BudgetTable
                        title="SAVINGS (20%)"
                        items={data.savings}
                        // total={data.totals.totalSavings} 
                        rowCount={6}
                        showTotal={false}
                        currency={currency}
                    />

                    <SummaryTable totals={data.totals} currency={currency} />

                    <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>SMART INSIGHTS</Text>

                        {/* Projection */}
                        {(() => {
                            const { dailyStats, insightData } = data as any;
                            if (!insightData || insightData.daysPassed === 0) return null;

                            const { totalIncome, expenses } = data.totals;
                            const currencySymbol = currency === 'USD' ? '$' : currency === 'NPR' ? 'Rs.' : currency;

                            // Projection Logic
                            const dailyAverage = expenses / insightData.daysPassed;
                            const projectedTotal = dailyAverage * insightData.daysInMonth;
                            const projectedSavings = totalIncome - projectedTotal;

                            // Savings Health
                            const savingsRate = totalIncome > 0 ? (data.totals.totalSavings / totalIncome) * 100 : 0;
                            const isSavingsHealthy = savingsRate >= 20;

                            // Zero Spend Days
                            const daysWithExpense = dailyStats.filter((d: any) => d.expense > 0).length;
                            const zeroSpendDays = Math.max(0, insightData.daysPassed - daysWithExpense);

                            return (
                                <View style={{ marginTop: 5, gap: 4 }}>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                        <Text style={{ fontSize: 9 }}>
                                            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Projection: </Text>
                                            Est. spend <Text style={{ color: '#E11D48' }}>{formatCurrency(projectedTotal, currency)}</Text>.
                                            Track to save <Text style={{ color: projectedSavings > 0 ? '#16A34A' : '#E11D48' }}>{formatCurrency(projectedSavings, currency)}</Text>.
                                        </Text>
                                    </View>

                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                        <Text style={{ fontSize: 9 }}>
                                            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Savings: </Text>
                                            Rate is <Text style={{ color: isSavingsHealthy ? '#16A34A' : '#CA8A04' }}>{savingsRate.toFixed(1)}%</Text>.
                                            {isSavingsHealthy ? " Great job! Target met." : " Aim for 20%."}
                                        </Text>
                                    </View>

                                    {zeroSpendDays > 0 && (
                                        <Text style={{ fontSize: 9 }}>
                                            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Wins: </Text>
                                            <Text style={{ color: '#2563EB' }}>{zeroSpendDays} Zero-Spend Days</Text> this month.
                                        </Text>
                                    )}
                                </View>
                            );
                        })()}
                    </View>
                </View>

                {/* Right Column */}
                <View style={styles.column}>
                    <BudgetTable
                        title="NEEDS (50%)"
                        items={data.needs}
                        total={data.totals.totalNeeds}
                        rowCount={12}
                        currency={currency}
                    />

                    <BudgetTable
                        title="WANTS (30%)"
                        items={data.wants}
                        total={data.totals.totalWants}
                        rowCount={10}
                        currency={currency}
                    />
                </View>
            </View>
        </Page>
    </Document>
);
