# D'aMigo's — Flow Diagrams (v2.0)

## Scan → Spark opt-in → game → paid order

```mermaid
sequenceDiagram
  participant G as Guest
  participant Spark as Kapso Spark
  participant GW as guest-web
  participant API as guest-api
  participant R as rewards
  participant SR as Shiprocket
  participant RZ as Razorpay
  participant K as crm-api/WS
  participant Food as Kapso Food

  G->>API: Scan /s/token
  API-->>Spark: Opt-in interactive
  G->>Spark: Yes Unlock My Reward
  Spark->>API: opt-in webhook
  Spark-->>G: Open play webview
  G->>GW: spin + Sparkle Win claim
  GW->>API: rewards claim
  API->>R: outcome + claim
  G->>GW: menu + cart (+ optional Cross-By)
  GW->>API: delivery quote / checkout-group
  API->>SR: rate check
  G->>GW: pay
  GW->>API: POST checkout-groups
  API->>RZ: payment session
  RZ-->>API: webhook captured
  API->>K: order PAID event(s)
  API->>Food: utility bill + track link
```

## Kitchen Accept → timer → rider → penalty

```mermaid
sequenceDiagram
  participant Chef as Kitchen CRM
  participant API as crm-api
  participant SR as Shiprocket
  participant GW as guest-web
  participant Food as Kapso Food

  Chef->>API: POST orders/:id/accept
  API->>API: set committed_prep 10|15
  API->>SR: create shipment
  API-->>GW: prep deadline
  API-->>Food: ETA utility
  opt Extend once before T-3m
    Chef->>API: POST extend-prep +5
    API-->>GW: updated deadline
  end
  SR-->>API: rider_at_pickup
  alt Ready within grace
    Chef->>API: ready-for-pickup
  else Overtime
    API->>API: WAITING_PENALTY_DEBIT
  end
```

## Cross-By 1 km rider split

```mermaid
flowchart TD
  A[Cart has 2 restaurants] --> B{Haversine R1-R2}
  B -->|<= 1.0 km| C[rider_mode SINGLE]
  B -->|> 1.0 km| D[rider_mode SPLIT]
  C --> E[1x delivery fee]
  D --> F[2x delivery fee]
  E --> G[checkout_group pay]
  F --> G
```

## CRM campaign send (Spark)

```mermaid
sequenceDiagram
  participant O as Owner
  participant CW as crm-web
  participant API as crm-api
  participant Q as queue
  participant W as worker
  participant Spark as Kapso Spark

  O->>CW: schedule campaign
  CW->>API: POST campaigns/:id/schedule
  API->>Q: enqueue recipients
  W->>API: load batch
  W->>W: 7-day cap filter
  W->>W: wallet debit
  W->>Spark: send marketing template
  Spark-->>API: webhook status
```

## D'aMigo Food Smart HI

```mermaid
flowchart TD
  H[Inbound HI to Food WABA] --> L{Phone in customers?}
  L -->|Yes + history| R[Carousel last 3 kitchens + 3 quick replies]
  L -->|No| N[Hub welcome + First-Order FREE Delivery]
```
