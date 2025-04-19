import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Input,
  Select,
  Text,
  Heading,
  VStack,
  HStack,
  Collapse,
  useDisclosure,
  FormControl,
  IconButton,
  Container
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { addMonths, isSameMonth } from "date-fns";
import { useFirestore } from "../services/firestore"
import { useAuth } from "../context/useAuth"

const initialBudget = 0;
const getCurrentMonthKey = () => new Date().toISOString().slice(0, 7); // "YYYY-MM"

export default function FinancialReports() {
  const { user } = useAuth();
  const userId = user?.uid;
  const { getDocument, saveDocument } = useFirestore();
  const currentMonthKey = getCurrentMonthKey();

  const [budgetLimit, setBudgetLimit] = useState(initialBudget);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [expenseType, setExpenseType] = useState("subscription");
  const [newExpense, setNewExpense] = useState({});

  const {
    isOpen: isSubsOpen,
    onToggle: toggleSubs
  } = useDisclosure();

  const {
    isOpen: isHistoryOpen,
    onToggle: toggleHistory
  } = useDisclosure();

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      const doc = await getDocument("users", userId, "financialReports", currentMonthKey);
      if (doc) {
        setBudgetLimit(doc.budgetLimit || 0);
        setSubscriptions(doc.subscriptions || []);
        setMonthlyExpenses(doc.monthlyExpenses || []);
      }
    };
    loadData();
  }, [userId, currentMonthKey]);

  useEffect(() => {
    if (!userId || subscriptions.length === 0) return;
    const now = new Date();
    const updatedExpenses = subscriptions.filter(sub =>
      isSameMonth(new Date(sub.nextBillingDate), now)
    );
    if (updatedExpenses.length > 0) {
      const newExpenses = updatedExpenses.map(sub => ({
        name: sub.platform,
        price: sub.price,
        date: new Date().toISOString(),
        type: "subscription"
      }));
      setMonthlyExpenses(prev => {
        const combined = [...prev, ...newExpenses];
        saveDocument("users", userId, "financialReports", currentMonthKey, {
          budgetLimit,
          subscriptions,
          monthlyExpenses: combined
        });
        return combined;
      });
    }

    setSubscriptions(subs => subs.map(sub => ({
      ...sub,
      nextBillingDate: addMonths(new Date(sub.nextBillingDate), 1).toISOString()
    })));
  }, []);

  const handleAddExpense = () => {
    if (!userId) return;
    let updatedExpenses = [];
    if (expenseType === "subscription") {
      const subscription = {
        platform: newExpense.platform,
        price: parseFloat(newExpense.price),
        period: newExpense.period,
        services: newExpense.services || "",
        nextBillingDate: new Date().toISOString()
      };
      const updatedSubs = [...subscriptions, subscription];
      updatedExpenses = [...monthlyExpenses, {
        name: newExpense.platform,
        price: parseFloat(newExpense.price),
        date: new Date().toISOString(),
        type: "subscription"
      }];
      setSubscriptions(updatedSubs);
      setMonthlyExpenses(updatedExpenses);
      saveDocument("users", userId, "financialReports", currentMonthKey, {
        budgetLimit,
        subscriptions: updatedSubs,
        monthlyExpenses: updatedExpenses
      });
    } else {
      updatedExpenses = [...monthlyExpenses, {
        name: newExpense.name,
        price: parseFloat(newExpense.price),
        date: new Date().toISOString(),
        type: "monthly"
      }];
      setMonthlyExpenses(updatedExpenses);
      saveDocument("users", userId, "financialReports", currentMonthKey, {
        budgetLimit,
        subscriptions,
        monthlyExpenses: updatedExpenses
      });
    }
    setNewExpense({});
  };

  const handleCancelSubscription = (platform) => {
    if (!userId) return;
    const filtered = subscriptions.filter(sub => sub.platform !== platform);
    setSubscriptions(filtered);
    saveDocument("users", userId, "financialReports", currentMonthKey, {
      budgetLimit,
      subscriptions: filtered,
      monthlyExpenses
    });
  };

  const handleBudgetBlur = () => {
    if (!userId) return;
    saveDocument("users", userId, "financialReports", currentMonthKey, {
      budgetLimit,
      subscriptions,
      monthlyExpenses
    });
  };

  const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.price, 0);
  const isOverBudget = totalExpenses > budgetLimit && budgetLimit > 0;

  return (
    <Container maxW="container.lg" p={4}>
      <VStack spacing={6} align="stretch">
        <Box borderWidth="1px" borderRadius="lg" p={4}>
          <Heading size="md" mb={2}>Set monthly budget limit</Heading>
          <FormControl>
            <Input
              type="number"
              placeholder="Monthly budget limit"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(parseFloat(e.target.value))}
              onBlur={handleBudgetBlur}
            />
          </FormControl>
          <Text
            fontSize="sm"
            mt={2}
            color={isOverBudget ? "red.500" : "gray.600"}
            fontWeight={isOverBudget ? "bold" : "normal"}
          >
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
                <Input placeholder="Contract period (e.g., monthly, yearly)" value={newExpense.period || ""} onChange={e => setNewExpense({ ...newExpense, period: e.target.value })} />
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
            <Heading size="md">Expense history</Heading>
            <IconButton size="sm" icon={isHistoryOpen ? <ChevronDownIcon /> : <ChevronRightIcon />} />
          </HStack>
          <Collapse in={isHistoryOpen} animateOpacity>
            <VStack spacing={2} align="stretch" mt={4}>
              {monthlyExpenses.map((exp, index) => (
                <HStack key={index} justify="space-between" fontSize="sm" borderBottomWidth="1px" pb={1}>
                  <Text>{exp.name}</Text>
                  <Text>{exp.price} RON</Text>
                </HStack>
              ))}
            </VStack>
          </Collapse>
        </Box>
      </VStack>
    </Container>
  );
}
