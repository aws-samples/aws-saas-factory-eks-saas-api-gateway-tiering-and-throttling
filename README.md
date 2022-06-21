# SaaS Factory EKS SaaS API Gateway Tiering and Throttling

The code provided here is intended to accompany the AWS Blog - Enabling Tiering and Throttling in a Multi-tenant Amazon EKS SaaS solution using Amazon API Gateway. The working example is built on top of the EKS SaaS Workshop by SaaS Factory.  The working example demonstrates throttling strategy for different tiers through the usage of API Gateway, Usage Plans, and API Keys.  API Gateway will be provisioned in front of a EKS cluster and all requests will be evaluated before being passed through to the EKS cluster.

### TODO: Include link to the published SaaS Factory EKS SaaS Workshop and blog