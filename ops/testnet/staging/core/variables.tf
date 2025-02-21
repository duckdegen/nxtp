variable "region" {
  default = "us-east-1"
}

variable "cidr_block" {
  default = "172.17.0.0/16"
}

variable "az_count" {
  default = "2"
}

variable "domain" {
  description = "domain of deployment"
  default     = "core"
}

variable "stage" {
  description = "stage of deployment"
  default     = "staging"
}

variable "environment" {
  description = "env we're deploying to"
  default     = "testnet"
}

variable "nomad_environment" {
  description = "nomad environment type"
  default     = "staging"
}

variable "full_image_name_router" {
  type        = string
  description = "router image name"
  default     = "ghcr.io/connext/router:sha-698acef"
}


variable "full_image_name_sequencer" {
  type        = string
  description = "sequencer image name"
  default     = "ghcr.io/connext/sequencer:sha-698acef"
}

variable "full_image_name_lighthouse" {
  type        = string
  description = "router image name"
  default     = "ghcr.io/connext/lighthouse:sha-698acef"
}

variable "mnemonic" {
  type        = string
  description = "mnemonic"
  default     = "female autumn drive capable scorpion congress hockey chunk mouse cherry blame trumpet"
}

variable "admin_token_router" {
  type        = string
  description = "admin token"
}


variable "certificate_arn_testnet" {
  default = "arn:aws:acm:us-east-1:679752396206:certificate/45908dc4-137b-4366-8538-4f59ee6a914e"
}

variable "rinkeby_alchemy_key_0" {
  type = string
}

variable "kovan_alchemy_key_0" {
  type = string
}

variable "goerli_alchemy_key_0" {
  type = string
}

variable "rinkeby_alchemy_key_1" {
  type = string
}

variable "kovan_alchemy_key_1" {
  type = string
}

variable "goerli_alchemy_key_1" {
  type = string
}

variable "dd_api_key" {
  type = string
}

variable "web3_signer_private_key" {
  type = string
}
