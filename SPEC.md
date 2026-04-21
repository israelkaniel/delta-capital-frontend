# [**Loan Sales Agent Commission Management System**](https://claude.ai/public/artifacts/9c2d91f8-cf3a-4ecd-b96e-4af68ab1be24)

## **Functional Specification Document**

### **Prepared for Client Review and Approval**

---

# **1\. Executive Summary**

This document describes the functional specification for the **Loan Sales Agent Commission Management System**.

The system is designed to support organizations that manage loan sales through internal or external sales agents and need a structured way to calculate, track, and control commission payments.

The system will provide capabilities to:

* Manage customer records and loan transactions

* Support deals involving **multiple sales agents**

* Automatically calculate commissions based on configurable rules

* Support different commission bases depending on the financing institution

* Manage commission reserves for transactions under review

* Handle partial or full commission reserves

* Track commission reversals and adjustments

* Maintain a full commission ledger for each agent

* Record payments made to agents

* Produce management reports and performance insights

* Support a monthly financial closing process

* Receive deal information from Salesforce via webhook integration

The system aims to create **transparent, accurate, and controlled commission management across the organization**.

---

# **2\. Business Objectives**

The system is intended to achieve several core business goals.

### **Transparency**

Provide clear visibility into commissions earned, reserved, released, or reversed.

### **Accuracy**

Ensure commissions are calculated consistently according to defined commission rules.

### **Financial Control**

Allow finance managers to manage reserves, partial payouts, and commission reversals.

### **Accountability**

Maintain a complete historical audit trail for all financial and operational actions.

### **Operational Efficiency**

Reduce manual commission calculations and minimize financial errors.

---

# **3\. Core Business Entities**

The system is built around several key entities.

---

## **Customer**

A borrower who may request financing.

A customer may have **multiple loan transactions** over time.

---

## **Customer Case**

A business record representing a customer’s financing request.

Each case may include **multiple loans** associated with the same customer.

---

## **Loan**

A financing transaction provided by a financing institution.

Each loan is associated with:

* One customer

* One financing institution

* One or more sales agents

---

## **Sales Agents**

Sales representatives responsible for originating the deal.

A loan may involve **multiple agents**, each with an assigned commission share.

Example:

| Agent | Share |
| ----- | ----- |
| Agent A | 60% |
| Agent B | 40% |

The system will calculate the total commission for the loan and distribute it based on these defined shares.

---

## **Financing Institutions (Lenders)**

Financial organizations providing the loan.

Each lender may have different rules regarding:

* Commission calculation base

* Commission timing

* Reserve requirements

The system maintains a centralized registry of financing institutions.

---

# **4\. Loan Lifecycle**

The loan lifecycle determines when commissions are generated.

---

## **Loan Creation**

Loans may initially be created manually within the system.

In future phases, loans may also be created automatically via integrations.

---

## **Key Status: Funds Transferred**

The most important milestone is when the loan funds are successfully transferred to the borrower.

This event triggers the commission eligibility process.

---

# **5\. Commission Base Calculation**

The base amount used for commission calculations may vary depending on the lender.

The system supports multiple commission bases:

* **Transferred Amount** – amount paid to the borrower

* **Payback Amount** – total repayment value of the loan

* Other lender-defined values if required in future

Each lender configuration determines which base is used for commission calculation.

---

# **6\. Commission Rules**

The system supports flexible commission rule structures.

---

## **Commission Rule Types**

### **Fixed Percentage**

A fixed percentage applied to the commission base.

Example:

Loan Base Amount: $100,000

Commission Rate: 2%

Commission: $2,000

---

### **Tiered Commission**

Different commission percentages depending on loan size.

Example:

| Loan Amount | Commission Rate |
| ----- | ----- |
| Up to $50,000 | 1.5% |
| $50,000 – $100,000 | 2% |
| Above $100,000 | 2.5% |

---

# **7\. Commission Rule Hierarchy**

The system supports two levels of commission rules.

---

## **Global Commission Rules**

Default rules applied across the organization.

---

## **Agent-Specific Commission Rules**

Rules applied to a specific agent.

Agent rules may operate in two modes:

### **Replace Mode**

The agent rule completely replaces the global rule.

### **Add-On Mode**

The agent rule adds additional commission on top of the global rule.

Example:

Global Rule: 2%

Agent Bonus: \+0.5%

Final Commission: 2.5%

---

# **8\. Commission Rules Validity Period**

Each commission rule includes:

* Start Date

* End Date

A loan will use the rule that was valid at the time the commission event occurred.

This ensures accurate historical commission calculations.

---

# **9\. Multi-Agent Commission Allocation**

Because multiple agents may participate in a deal, the system will support:

* Multiple agents assigned to the same loan

* Percentage allocation of commission between agents

* Adjusted commission percentages depending on deal structure

The total commission is calculated first, then allocated according to agent shares.

---

# **10\. Commission Reserve (Transactions Under Review)**

Certain situations require commissions to be temporarily withheld.

Examples include:

* Borrower default risk

* Loan cancellation

* Management review

* Pending early pay period

To handle these scenarios, the system includes a **Commission Reserve mechanism**.

---

# **11\. Partial and Full Commission Reserves**

Unlike the initial assumption that reserves equal 100% of commission, the system will support:

### **Full Reserve**

The entire commission is placed on hold.

### **Partial Reserve**

A portion of the commission is released immediately, while the remaining amount is reserved.

Example:

| Total Commission | Released | Reserved |
| ----- | ----- | ----- |
| $1,000 | $600 | $400 |

This allows flexibility depending on lender policies.

---

# **12\. Reserve Outcomes**

A reserved commission may result in one of the following outcomes.

### **Released to Agent**

Reserved commission is returned to the agent’s available balance.

### **Reversed to Business**

Commission is permanently deducted.

### **Remains Reserved**

The commission stays in reserve until further review.

---

# **13\. Agent Commission Ledger**

Each agent has a complete financial ledger.

The ledger records every commission-related movement.

---

## **Ledger Entry Types**

The system supports the following transaction types:

* Commission Earned

* Transfer to Reserve

* Partial Reserve Allocation

* Release from Reserve

* Commission Reversal

* Payment Recorded

* Payment Correction

* Manual Adjustment

---

## **Ledger Principles**

* Ledger entries are **never deleted**

* Corrections are recorded as additional entries

* Full historical traceability is maintained

---

# **14\. Agent Financial Balances**

The system calculates three balances for each agent.

### **Total Commission Balance**

Total commissions generated.

### **Reserve Balance**

Total commissions currently held in reserve.

### **Available Balance**

Amount available for payment.

Formula:

Available Balance

\= Total Commissions

− Reserved Amount

− Reversed Amount

---

# **15\. Commission Payments**

The system does not execute payments.

Instead, it records payment information for financial tracking.

Finance users may record:

* Payment Date

* Payment Reference

* Notes

Payments may be recorded for:

* A specific commission entry

* Multiple selected ledger entries

Each payment record generates a ledger transaction.

---

# **16\. Monthly Closing**

The system includes a **monthly financial closing process**.

Monthly closing allows the organization to:

* Lock financial records

* Prevent retroactive modifications

* Generate monthly summaries

---

# **17\. Monthly Agent Summary**

For each agent, the system generates a monthly summary including:

* Number of customers

* Number of loans

* Total loan volume

* Total commissions generated

* Reserved commissions

* Released reserves

* **Reversed commissions**

* Payments recorded

* Opening balance

* Closing balance

* Available balance

---

# **18\. Reporting**

---

## **Management Reports**

Management users can generate reports including:

* Agent performance comparisons

* Monthly commission totals

* Reserve and reversal analysis

* Loan volume by lender

* Agent financial summaries

* Commission ledger reports

---

## **Agent Dashboard**

Agents will have access to a personal dashboard showing:

* Loans originated

* Commissions earned

* Reserved commissions

* Available balance

* Payments received

* Historical activity

Agents will **not** see comparative performance against other agents at this stage.

---

# **19\. Roles and Permissions**

---

## **Sales Agent**

Can view only their own data.

Includes:

* Personal dashboard

* Personal commission ledger

* Loans related to their deals

---

## **Finance Manager**

Responsible for financial control actions.

Permissions include:

* Moving commissions to reserve

* Releasing or reversing reserves

* Recording payments

* Adding financial notes

---

## **System Administrator**

Full system access including:

* Managing agents

* Managing commission rules

* Viewing all data

* Generating reports

* Executing monthly closing

---

# **20\. Audit Trail**

The system maintains a full audit history.

Tracked actions include:

* Loan status changes

* Commission calculations

* Reserve actions

* Payment records

* Rule modifications

* Manual adjustments

Each log entry includes:

* Previous value

* New value

* User performing the change

* Timestamp

* Optional notes

---

# **21\. Salesforce Integration**

The system will support **incoming webhooks from Salesforce**.

This allows Salesforce to automatically create:

* New customers

* Loan transactions

This ensures that loan deals created in Salesforce can flow directly into the commission system.

Future phases may introduce a full API integration.

---

# **22\. Key Benefits of the System**

### **Transparent Commission Tracking**

Every commission event is clearly recorded.

### **Financial Risk Management**

Reserve mechanisms allow controlled handling of risky transactions.

### **Flexible Commission Models**

Supports multiple commission structures and lender requirements.

### **Scalable Architecture**

Designed to integrate with existing CRM systems.

### **Improved Operational Efficiency**

Automates commission calculations and reduces manual work.

