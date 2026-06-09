import { NextRequest, NextResponse } from "next/server";
import { getMilestones, updateMilestone, getLeads, saveMilestone, deleteMilestone } from "@/lib/db";

export async function GET() {
  try {
    const milestones = await getMilestones();
    const leads = await getLeads();

    // Compute metrics
    const lettersDelivered = leads.filter(l => l.delivery_date !== null || l.status === 'delivered').length;
    const followUpsSent = leads.filter(l => l.follow_up_sent_date !== null || l.status === 'follow_up_sent').length;
    
    const hasResponse = (l: any) => l.first_response_date !== null || ['responded', 'first_call', 'meeting_booked', 'meeting_completed', 'proposal_sent', 'follow_up_sent', 'won'].includes(l.status);
    const firstEnquiry = leads.some(hasResponse) ? 1 : 0;
    
    const hasMeeting = (l: any) => l.meeting_booked_date !== null || l.meeting_completed_date !== null || ['meeting_booked', 'meeting_completed', 'proposal_sent', 'follow_up_sent', 'won'].includes(l.status);
    const firstMeeting = leads.some(hasMeeting) ? 1 : 0;
    
    const hasProposal = (l: any) => l.proposal_sent_date !== null || ['proposal_sent', 'follow_up_sent', 'won'].includes(l.status);
    const firstProposal = leads.some(hasProposal) ? 1 : 0;
    
    const firstClient = leads.some(l => l.status === 'won') ? 1 : 0;
    const totalRevenue = leads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.offer_price || 300), 0);
    const mrr = leads.filter(l => l.status === 'won').length * 25;

    const firstTradesClient = leads.some(l => l.status === 'won' && l.industry_category === 'Local Trades') ? 1 : 0;
    const firstProfessionalServicesClient = leads.some(l => l.status === 'won' && l.industry_category === 'Professional Services') ? 1 : 0;
    const firstSoftwareProject = leads.some(l => l.status === 'won' && l.industry_category === 'Technology') ? 1 : 0;

    const metricsMap: Record<string, number> = {
      letters_delivered: lettersDelivered,
      follow_ups_sent: followUpsSent,
      first_enquiry: firstEnquiry,
      first_meeting: firstMeeting,
      first_proposal: firstProposal,
      first_client: firstClient,
      total_revenue: totalRevenue,
      mrr: mrr,
      first_trades_client: firstTradesClient,
      first_professional_services_client: firstProfessionalServicesClient,
      first_software_project: firstSoftwareProject,
    };

    // Update milestones completion state if target is reached
    const updatedMilestones = [];
    for (const milestone of milestones) {
      const currentValue = metricsMap[milestone.metric] || 0;
      milestone.current_value = currentValue;

      if (currentValue >= milestone.target_value && !milestone.completed_date) {
        const todayStr = new Date().toISOString();
        await updateMilestone(milestone.id, todayStr, milestone.celebration_notes);
        milestone.completed_date = todayStr;
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

