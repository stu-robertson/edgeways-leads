import { NextRequest, NextResponse } from "next/server";
import { getMilestones, updateMilestone, getLeads, saveMilestone, deleteMilestone } from "@/lib/db";

export async function GET() {
  try {
    const milestones = await getMilestones();
    const leads = await getLeads();

    // Compute metrics
    const lettersDelivered = leads.filter(l => l.delivery_date !== null || l.status === 'delivered').length;
    const followUpsSent = leads.filter(l => l.follow_up_sent_date !== null || l.status === 'follow_up_sent').length;
    
    const hasResponse = (l: any) => 
      l.status !== 'not_suitable' && l.status !== 'no_response' && 
      (l.first_response_date !== null || !['new', 'printed', 'delivered'].includes(l.status));
      
    const hasMeeting = (l: any) => 
      l.status !== 'not_suitable' && l.status !== 'no_response' && 
      (l.meeting_booked_date !== null || l.meeting_completed_date !== null || !['new', 'printed', 'delivered', 'responded', 'first_call'].includes(l.status));
      
    const hasProposal = (l: any) => 
      l.status !== 'not_suitable' && l.status !== 'no_response' && 
      (l.proposal_sent_date !== null || ['proposal_sent', 'follow_up_sent', 'won'].includes(l.status));
      
    const enquiries = leads.filter(hasResponse).length;
    const meetings = leads.filter(hasMeeting).length;
    const proposals = leads.filter(hasProposal).length;
    const clients = leads.filter(l => l.status === 'won').length;
    const totalRevenue = leads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.offer_price || 300), 0);
    const mrr = leads.filter(l => l.status === 'won').length * 25;

    const tradesClients = leads.filter(l => l.status === 'won' && l.industry_category === 'Local Trades').length;
    const professionalServicesClients = leads.filter(l => l.status === 'won' && l.industry_category === 'Professional Services').length;
    const softwareProjects = leads.filter(l => l.status === 'won' && l.industry_category === 'Technology').length;

    const metricsMap: Record<string, number> = {
      letters_delivered: lettersDelivered,
      follow_ups_sent: followUpsSent,
      enquiries: enquiries,
      meetings: meetings,
      proposals: proposals,
      clients: clients,
      total_revenue: totalRevenue,
      mrr: mrr,
      trades_clients: tradesClients,
      professional_services_clients: professionalServicesClients,
      software_projects: softwareProjects,
    };

    // Update milestones completion state dynamically (including auto-revert)
    const updatedMilestones = [];
    for (const milestone of milestones) {
      const currentValue = metricsMap[milestone.metric] || 0;
      milestone.current_value = currentValue;

      if (currentValue >= milestone.target_value && !milestone.completed_date) {
        const todayStr = new Date().toISOString();
        await updateMilestone(milestone.id, todayStr, milestone.celebration_notes);
        milestone.completed_date = todayStr;
      } else if (currentValue < milestone.target_value && milestone.completed_date) {
        await updateMilestone(milestone.id, null, milestone.celebration_notes);
        milestone.completed_date = null;
      }
      updatedMilestones.push(milestone);
    }

    return NextResponse.json(updatedMilestones);
  } catch (error) {
    console.error("GET /api/milestones error:", error);
    return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, type, metric, target_value, reward, completed_date, celebration_notes, archived } = body;

    if (!id) {
      return NextResponse.json({ error: "Milestone ID is required" }, { status: 400 });
    }

    if (title && type && metric && target_value !== undefined) {
      // Full save/update
      const updated = await saveMilestone({
        id,
        title,
        type,
        metric,
        target_value,
        reward: reward || null,
        completed_date: completed_date || null,
        celebration_notes: celebration_notes || null,
        archived: archived || false
      });
      return NextResponse.json(updated);
    } else {
      // Quick notes update
      const updated = await updateMilestone(id, completed_date, celebration_notes, archived);
      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error("PUT /api/milestones error:", error);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, type, metric, target_value, reward } = body;

    if (!title || !type || !metric || target_value === undefined) {
      return NextResponse.json({ error: "Missing required milestone fields" }, { status: 400 });
    }

    // Generate unique slug-based ID
    const id = `${type}_${metric}_${target_value}_${Date.now()}`;

    const newMilestone = await saveMilestone({
      id,
      title,
      type,
      metric,
      target_value,
      reward: reward || null,
      completed_date: null,
      celebration_notes: null
    });

    return NextResponse.json(newMilestone);
  } catch (error) {
    console.error("POST /api/milestones error:", error);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Milestone ID is required" }, { status: 400 });
    }

    await deleteMilestone(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/milestones error:", error);
    return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 });
  }
}

