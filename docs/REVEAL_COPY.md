# AetherSDK Showcase Reveal Copy

All copy describes the illustrative showcase. It makes no delivery-time,
performance, adoption, or production-readiness claim. The tenant, people,
hosts, and records are fictional. Naming a vendor (UKG, Xperience, Docebo,
LinkedIn Learning, Axonify, Tableau) describes the systems a credit union
integrates, not a partnership or a shipped adapter.

## Title

Aether SDK — the seams between systems, made operable

## Short description

An integration control plane for the systems a credit union runs on: people
data flows in from UKG and Xperience, is provisioned out to Docebo, LinkedIn
Learning and Axonify, and completions flow back to analytics — one identity
chain from connector validation through governed sync, retry, audit, webhook
delivery and dead-letter replay.

## Case-study summary

Every integration project rebuilds the same plumbing: entity models, sync
loops, webhook handling, secret references, tenant separation. Aether SDK is
the substrate that makes the next integration a connector, not an application.
This cockpit shows the use case that led to the build — a credit union whose
HR systems of record (UKG, Xperience) had to keep three learning platforms
(Docebo, LinkedIn Learning, Axonify) and an analytics layer (Tableau) in step,
with terminations that actually reach every system. The demo carries stable
tenant, request, run, entity, event, delivery and payload identities through
two inspectable flows: a new-hire provisioning fan-out where one target fails
and is retried without duplicating the others, and a completion event whose
webhook delivery exhausts into a dead letter and is replayed with the same
identities. Desktop governance and a purpose-built phone companion read the
same fixture graph and the same permission policy.

## Open Graph alt text

Aether SDK operations cockpit: a credit union's UKG-to-learning-platform
provisioning run with connector health, sync stages, audit lineage and webhook
recovery in a light, high-density console.

## Teaser

Where enterprise systems meet — and break. One identity chain, every
consequence visible.

## Portfolio card

**Aether SDK — integration substrate**
Live demo · fictional credit-union tenant

Trace a new hire from UKG into Docebo, LinkedIn Learning and Axonify: one
governed sync, one failed target retried without duplicates, one webhook dead
letter replayed — with the identities that connect every step.

## Disclosure line

Portfolio demo · mock data. Illustrative interface; no live tenant, customer,
credential, provider, or production endpoint is used. Vendor names describe
the integrated systems; the engine's vendor connectors are built per
deployment from its OpenAPI adapter generator.
