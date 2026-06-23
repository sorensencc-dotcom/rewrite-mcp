/**
 * CIC Context Service HTTP Server
 * Express server implementing the Context API contract
 */
import express from "express";
import { ContextServiceConfig } from "./ContextService";
export interface ServerConfig extends ContextServiceConfig {
    port: number;
    host: string;
    version: string;
}
export declare class ContextServer {
    private app;
    private service;
    private config;
    private flowRegistry;
    private flowOrchestrator;
    constructor(config: ServerConfig);
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    private loadFlowTemplates;
    start(): Promise<void>;
    getApp(): express.Application;
}
export default ContextServer;
