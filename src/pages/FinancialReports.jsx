import React, { useState, useEffect } from "react";
import {
  Box, Button, Input, Select, Text, Heading, VStack, HStack, Collapse,
  useDisclosure, FormControl, IconButton, Container
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { addMonths, subMonths, format } from "date-fns";
import { useFirestore } from "../services/firestore";
import { useAuth } from "../context/useAuth";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const getCurrentMonthKey = () => new Date().toISOString().slice(0, 7);
const getLast6MonthKeys = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) =>
    format(subMonths(now, i), "yyyy-MM")
  ).reverse();
};

const COLORS = ["#3182CE", "#E53E3E"];

export default function FinancialReports() {
  const { user } = useAuth();
  const userId = user?.uid;
  const { getDocument, saveDocument } = useFirestore();
  const currentMonthKey = getCurrentMonthKey();

  const [budgetLimit, setBudgetLimit] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [expenseType, setExpenseType] = useState("subscription");
  const [newExpense, setNewExpense] = useState({});

  const { isOpen: isSubsOpen, onToggle: toggleSubs } = useDisclosure();
  const { isOpen: isHistoryOpen, onToggle: toggleHistory } = useDisclosure();

  const loadData = async () => {
    if (!userId) return;

    const doc = await getDocument("users", userId, "financialReports", currentMonthKey, true);

    if (doc) {
      const hasBudget = typeof doc.budgetLimit === "number" && doc.budgetLimit > 0;

      if (hasBudget) {
        setBudgetLimit(doc.budgetLimit);
      } else {
        const lastMonthKey = format(subMonths(new Date(currentMonthKey + "-01"), 1), "yyyy-MM");
        const lastMonthDoc = await getDocument("users", userId, "financialReports", lastMonthKey, true);
        const inferredBudget = lastMonthDoc?.budgetLimit || 0;

        setBudgetLimit(inferredBudget);

        await saveDocument("users", userId, "financialReports", currentMonthKey, {
          ...doc,
          budgetLimit: inferredBudget
        });
      }

      setSubscriptions(doc.subscriptions || []);
      setMonthlyExpenses(doc.monthlyExpenses || []);
    } else {
      const lastMonthKey = format(subMonths(new Date(currentMonthKey + "-01"), 1), "yyyy-MM");
      const lastMonthDoc = await getDocument("users", userId, "financialReports", lastMonthKey, true);

      const inheritedSubs = (lastMonthDoc?.subscriptions || []).map(sub => ({
        ...sub,
        nextBillingDate: new Date().toISOString()
      }));

      const inferredBudget = lastMonthDoc?.budgetLimit || 0;

      await saveDocument("users", userId, "financialReports", currentMonthKey, {
        budgetLimit: inferredBudget,
        subscriptions: inheritedSubs,
        monthlyExpenses: []
      });

      setBudgetLimit(inferredBudget);
      setSubscriptions(inheritedSubs);
      setMonthlyExpenses([]);
    }
  };

  const fetchLast6MonthsHistory = async () => {
    if (!userId) return;
    const monthKeys = getLast6MonthKeys();
    const allEntries = [];

    for (const key of monthKeys) {
      try {
        const doc = await getDocument("users", userId, "financialReports", key, true);
        if (doc) {
          const monthExpenses = (doc.monthlyExpenses || []).map(e => ({ ...e, _month: key }));
          const activeSubs = (doc.subscriptions || [])
            .filter(sub => (new Date(sub.nextBillingDate)).toISOString().slice(0, 7) === key)
            .map(sub => ({
              name: sub.platform,
              price: sub.price,
              date: sub.nextBillingDate,
              type: "subscription",
              _month: key
            }));
          allEntries.push(...monthExpenses, ...activeSubs);
        }
      } catch (e) { }
    }

    allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
    setHistoryEntries(allEntries);
  };

  useEffect(() => {
    loadData();
    fetchLast6MonthsHistory();
  }, [userId, currentMonthKey]);

  const handleAddExpense = async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    let updatedSubs = subscriptions;
    let updatedMonthly = monthlyExpenses;

    if (expenseType === "subscription") {
      const sub = {
        platform: newExpense.platform,
        price: parseFloat(newExpense.price),
        period: newExpense.period,
        services: newExpense.services || "",
        nextBillingDate: now
      };
      updatedSubs = [...subscriptions, sub];
      setSubscriptions(updatedSubs);
    } else {
      const exp = {
        name: newExpense.name,
        price: parseFloat(newExpense.price),
        date: now,
        type: "monthly"
      };
      updatedMonthly = [...monthlyExpenses, exp];
      setMonthlyExpenses(updatedMonthly);
    }

    await saveDocument("users", userId, "financialReports", currentMonthKey, {
      budgetLimit,
      subscriptions: updatedSubs,
      monthlyExpenses: updatedMonthly
    });

    setNewExpense({});
    await loadData();
    await fetchLast6MonthsHistory();
  };

  const handleCancelSubscription = async (platform) => {
    if (!userId) return;
    const filtered = subscriptions.filter(sub => sub.platform !== platform);
    setSubscriptions(filtered);

    await saveDocument("users", userId, "financialReports", currentMonthKey, {
      budgetLimit,
      subscriptions: filtered,
      monthlyExpenses
    });

    await loadData();
    await fetchLast6MonthsHistory();
  };

  const handleBudgetBlur = () => {
    if (!userId) return;
    saveDocument("users", userId, "financialReports", currentMonthKey, {
      budgetLimit,
      subscriptions,
      monthlyExpenses
    });
  };

  const totalExpenses = historyEntries
    .filter(e => e._month === currentMonthKey)
    .reduce((sum, e) => sum + e.price, 0);
  const isOverBudget = totalExpenses > budgetLimit && budgetLimit > 0;

  const monthlyTotals = getLast6MonthKeys().map(monthKey => {
    const total = historyEntries
      .filter(e => e._month === monthKey)
      .reduce((sum, e) => sum + e.price, 0);

    return { month: monthKey, total };
  });

  const subscriptionTotal = historyEntries.filter(e => e.type === "subscription").reduce((sum, e) => sum + e.price, 0);
  const monthlyTotal = historyEntries.filter(e => e.type === "monthly").reduce((sum, e) => sum + e.price, 0);

  const pieData = [
    { name: "Subscriptions", value: subscriptionTotal },
    { name: "Monthly", value: monthlyTotal }
  ];

  return (
    <Container maxW="container.lg" p={4}>
      <VStack spacing={6} align="stretch">
        <Box borderWidth="1px" borderRadius="lg" p={4}>
          <Heading size="md" mb={2}>Monthly budget limit</Heading>
          <FormControl>
            <Input
              type="number"
              placeholder="Monthly budget limit"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(parseFloat(e.target.value))}
              onBlur={handleBudgetBlur}
            />
          </FormControl>
          <Text fontSize="sm" mt={2} color={isOverBudget ? "red.500" : "gray.600"} fontWeight={isOverBudget ? "bold" : "normal"}>
            Current expenses: {totalExpenses} / {budgetLimit} RON
          </Text>
        </Box>

        <Box borderWidth="1px" borderRadius="lg" p={4}>
          <Heading size="md" mb={2}>Add expense</Heading>
          <Select value={expenseType} onChange={(e) => setExpenseType(e.target.value)}>
            <option value="subscription">Subscription</option>
            <option value="monthly">Monthly expense</option>
          </Select>
          <VStack spacing={2} mt={4}>
            {expenseType === "subscription" ? (
              <>
                <Input placeholder="Platform" value={newExpense.platform || ""} onChange={e => setNewExpense({ ...newExpense, platform: e.target.value })} />
                <Input placeholder="Price" type="number" value={newExpense.price || ""} onChange={e => setNewExpense({ ...newExpense, price: e.target.value })} />
                <Input placeholder="Contract period" value={newExpense.period || ""} onChange={e => setNewExpense({ ...newExpense, period: e.target.value })} />
                <Input placeholder="Included services (optional)" value={newExpense.services || ""} onChange={e => setNewExpense({ ...newExpense, services: e.target.value })} />
              </>
            ) : (
              <>
                <Input placeholder="Expense name" value={newExpense.name || ""} onChange={e => setNewExpense({ ...newExpense, name: e.target.value })} />
                <Input placeholder="Price" type="number" value={newExpense.price || ""} onChange={e => setNewExpense({ ...newExpense, price: e.target.value })} />
              </>
            )}
            <Button colorScheme="teal" onClick={handleAddExpense}>Add</Button>
          </VStack>
        </Box>

        <Box borderWidth="1px" borderRadius="lg" p={4}>
          <HStack justify="space-between" onClick={toggleSubs} cursor="pointer">
            <Heading size="md">Active subscriptions</Heading>
            <IconButton size="sm" icon={isSubsOpen ? <ChevronDownIcon /> : <ChevronRightIcon />} />
          </HStack>
          <Collapse in={isSubsOpen} animateOpacity>
            <VStack spacing={3} align="stretch" mt={4}>
              {subscriptions.map((sub, index) => (
                <Box key={index} borderBottomWidth="1px" pb={2}>
                  <HStack justify="space-between">
                    <Box>
                      <Text fontWeight="semibold">{sub.platform}</Text>
                      <Text fontSize="sm">{sub.price} RON / {sub.period}</Text>
                      <Text fontSize="sm" color="gray.500">{sub.services}</Text>
                    </Box>
                    <Button colorScheme="red" size="sm" onClick={() => handleCancelSubscription(sub.platform)}>
                      Cancel
                    </Button>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </Collapse>
        </Box>

        <Box borderWidth="1px" borderRadius="lg" p={4}>
          <HStack justify="space-between" onClick={toggleHistory} cursor="pointer">
            <Heading size="md">Expense history (last 6 months)</Heading>
            <IconButton size="sm" icon={isHistoryOpen ? <ChevronDownIcon /> : <ChevronRightIcon />} />
          </HStack>
          <Collapse in={isHistoryOpen} animateOpacity>
            <VStack spacing={4} align="stretch" mt={4}>
              <Box borderWidth="1px" borderRadius="lg" p={4}>
                <Heading size="md" mb={2}>Spending overview</Heading>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyTotals}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3182CE" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Box borderWidth="1px" borderRadius="lg" p={4}>
                <Heading size="md" mb={2}>Expense type distribution</Heading>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              {historyEntries.length === 0 ? (
                <Text fontSize="sm" color="gray.500">No expenses in the last 6 months.</Text>
              ) : (
                historyEntries.map((exp, index) => (
                  <HStack key={index} justify="space-between" fontSize="sm" borderBottomWidth="1px" pb={1}>
                    <Box>
                      <Text>{exp.name}</Text>
                      <Text fontSize="xs" color="gray.500">{exp._month}</Text>
                    </Box>
                    <Text>{exp.price} RON</Text>
                  </HStack>
                ))
              )}
            </VStack>
          </Collapse>
        </Box>
      </VStack>
    </Container>
  );
}
