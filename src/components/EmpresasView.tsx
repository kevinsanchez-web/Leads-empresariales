import React, { useState } from 'react';
import { Building2, Users, Star, DollarSign, Search, ChevronRight, Sparkles, Globe, ExternalLink, Loader2 } from 'lucide-react';
import { Lead, CompanyResearchInfo } from '../types';
import { researchCompany } from '../services/aiService';
import { cleanCompanyName, companyKey } from '../utils/company';

interface EmpresasViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (updated: Lead) => void;
}

export const EmpresasView: React.FC<EmpresasViewProps> = ({ leads, onSelectLead, onUpdateLead }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [researchingCompanies, setResearchingCompanies] = useState<{ [key: string]: boolean }>({});
  const [localCompanyInfo, setLocalCompanyInfo] = useState<{ [key: string]: CompanyResearchInfo }>({});

  // Group leads by company
  const companyMap: { [key: string]: Lead[] } = {};
  leads.forEach(l => {
    const key = companyKey(l.company);
    if (!companyMap[key]) companyMap[key] = [];
    companyMap[key].push(l);
  });

  const companiesList = Object.entries(companyMap)
    .map(([key, companyLeads]) => {
      const name = cleanCompanyName(companyLeads[0].company);
      const totalPipeline = companyLeads.reduce((acc, curr) => acc + (curr.estimatedValue || 35000), 0);
      const hasPriority = companyLeads.some(l => l.priority);
      const allInterests = Array.from(new Set(companyLeads.flatMap(l => l.interests)));
      const existingInfo = companyLeads.find(l => l.companyInfo)?.companyInfo || localCompanyInfo[name];

      return {
        name,
        leads: companyLeads,
        leadCount: companyLeads.length,
        totalPipeline,
        hasPriority,
        allInterests,
        companyInfo: existingInfo
      };
    })
    .filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.leads.some(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => b.leadCount - a.leadCount);

  const handleResearchCompany = async (companyName: string, companyLeads: Lead[]) => {
    setResearchingCompanies(prev => ({ ...prev, [companyName]: true }));
    try {
      const firstLead = companyLeads[0];
      const data: any = await researchCompany({
        companyName,
        leadName: firstLead?.name,
        role: firstLead?.role
      });
      if (data.success && data.companyInfo) {
        setLocalCompanyInfo(prev => ({ ...prev, [companyName]: data.companyInfo }));
        if (onUpdateLead) {
          companyLeads.forEach(l => {
            onUpdateLead({ ...l, companyInfo: data.companyInfo });
          });
        }
      }
    } catch (err) {
      console.error("Error al investigar empresa en EmpresasView:", err);
    } finally {
      setResearchingCompanies(prev => ({ ...prev, [companyName]: false }));
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Directorio de Empresas & Grounding IA</h2>
            <p className="text-xs text-slate-500">Investigación profunda de empresas en tiempo real mediante Google Search</p>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600 ml-auto sm:ml-2">{companiesList.length}</span>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid of Company Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {companiesList.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-8 text-center border border-slate-200/60 text-slate-400 font-medium text-xs">
            No se encontraron empresas.
          </div>
        ) : (
          companiesList.map(comp => {
            const isLoading = researchingCompanies[comp.name];
            return (
              <div 
                key={comp.name} 
                className="bg-white p-4 rounded-2xl border border-slate-200/70 hover:border-slate-300 shadow-xs transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate" title={comp.name}>{comp.name}</h3>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                        <span>{comp.leadCount} contacto{comp.leadCount > 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-600">${(comp.totalPipeline / 1000).toFixed(0)}k USD pipeline</span>
                      </div>
                    </div>
                    {comp.hasPriority && (
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
                    )}
                  </div>

                  {/* AI Google Search Grounding Box */}
                  <div className="my-2.5 p-3 rounded-xl bg-gradient-to-br from-blue-50/70 to-slate-50 border border-blue-100 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-900 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-600 fill-blue-500/20" />
                        IA Grounding (Google Search)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResearchCompany(comp.name, comp.leads)}
                        disabled={isLoading}
                        className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                            <span>Investigando...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3 text-blue-600" />
                            <span>{comp.companyInfo ? 'Actualizar' : 'Investigar'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isLoading && (
                      <div className="flex items-center gap-2 text-slate-600 py-1 text-[11px]">
                        <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
                        <span>Buscando qué hace {comp.name} en Google...</span>
                      </div>
                    )}

                    {comp.companyInfo && !isLoading && (
                      <div className="space-y-1.5 text-slate-700 text-[11px]">
                        <p className="line-clamp-3 leading-snug">
                          <strong className="text-slate-900">¿Qué hace?: </strong>
                          {comp.companyInfo.summary}
                        </p>
                        {comp.companyInfo.industry && (
                          <div className="text-[10px]">
                            <strong className="text-slate-900">Sector: </strong>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">{comp.companyInfo.industry}</span>
                          </div>
                        )}
                        {comp.companyInfo.sources && comp.companyInfo.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1 border-t border-blue-100/60">
                            {comp.companyInfo.sources.slice(0, 2).map((src, idx) => (
                              <a
                                key={idx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[9px] text-blue-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 hover:underline"
                              >
                                <Globe className="w-2.5 h-2.5 text-blue-500" />
                                <span className="truncate max-w-[100px]">{src.title}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!comp.companyInfo && !isLoading && (
                      <p className="text-[10px] text-slate-500 italic">
                        Haz clic en "Investigar" para consultar qué hace esta empresa con datos reales de Google Search.
                      </p>
                    )}
                  </div>

                  {/* Contact list */}
                  <div className="space-y-1 sm:space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contactos en la empresa:</span>
                    {comp.leads.slice(0, 3).map(lead => (
                      <button
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs cursor-pointer border border-slate-100"
                      >
                        <div className="min-w-0 pr-1">
                          <div className="font-bold text-slate-900 text-xs truncate">{lead.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{lead.role}</div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                    ))}
                    {comp.leads.length > 3 && (
                      <div className="text-[10px] text-slate-400 text-center font-medium">
                        +{comp.leads.length - 3} contactos más
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Tags */}
                {comp.allInterests.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    {comp.allInterests.map((interest, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold">
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
